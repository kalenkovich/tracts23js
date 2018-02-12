
# coding: utf-8

# In[15]:


import sys
from os import path
from collections import namedtuple
import numpy as np
from bs4 import BeautifulSoup
import nibabel
from os import path
from mayavi import mlab
from skimage import measure
from rdp import rdp


# ## Парсим сцену

# In[2]:


def extract_xyz_attributes(tag):
    return np.asarray([float(tag[axis]) for axis in ['x', 'y', 'z']])


# In[3]:


def parse_scene(scene_fpath):
        
    scene_dir = path.dirname(scene_fpath)

    with open(scene_fpath) as fp:
        scene = BeautifulSoup(fp, 'lxml')

    rois = scene.html.body.scene.rois.findAll('roi')
    tracts = scene.findAll('track')
    trk_rpath = scene.findAll("trackfile")[0]['rpath']

    voxel_size = extract_xyz_attributes(scene.findAll("voxelsize")[0])
    dimensions = extract_xyz_attributes(scene.findAll("dimension")[0])
    
    Scene = namedtuple('Scene', ['dir', 'rois', 'tracts', 'trk_rpath', 'voxel_size', 'dimensions'])
    return Scene(scene_dir, rois, tracts, trk_rpath, voxel_size, dimensions)


# ## Вытаскиваем координаты вершин волокон

# In[4]:


def extract_fibers(scene):
       
    trk_fpath = path.join(scene.dir, scene.trk_rpath)
    streams, header = nibabel.trackvis.read(trk_fpath)
    streamlines = [np.asarray(stream[0]) for stream in streams]
    
    return streamlines


# ## Находим волокна, входящие в тракты

# In[5]:


def roi_to_fiber_mask(scene, streamlines, roi, offset=(-2, -2, 0)):
    
    roi_type = roi['type']
    roi_id = int(roi['id'])
    
    dimensions = scene.dimensions
    voxel_size = scene.voxel_size
    
    if roi_type == 'Sphere':
        
        center = extract_xyz_attributes(roi.center) # in voxels and LPS
        center[:2] = dimensions[:2] - center[:2] + 1 # in voxel and RAS
        center += offset
        center += 0.5
        center = np.multiply(center, voxel_size) # in mm and RAS
        r = float(roi.radius['value']) * voxel_size[0] # Что делать, если воксели не кубические?
        roi_mask = [np.any(np.linalg.norm(line - center, axis=1) <= r) for line in streamlines]
        
    elif roi_type == 'HandDraw':
        
        roi_fpath = path.join(scene.dir, roi.imagefile['rpath'])
        roi_voxel_mask = nibabel.load(roi_fpath).get_data()
        roi_voxel_inds = set(zip(*np.nonzero(roi_voxel_mask)))
        
        def line_to_voxel_inds(line):
            voxel_inds = np.floor(line / voxel_size).astype(int)
            # voxel_inds -= offset
            # voxel_inds[:, 2] = dimensions[2] - voxel_inds[:, 2] + 1 # LPI -> LPS
            return set(map(tuple, voxel_inds))
        
        roi_mask = [bool(line_to_voxel_inds(line).intersection(roi_voxel_inds)) for line in streamlines]
        
    elif roi_type == 'FromImage':
        roi_mask = None
    
    return roi_id, roi_mask


# In[6]:


def extract_roi_fiber_masks(scene, streamlines):
    roi_fiber_masks = dict([roi_to_fiber_mask(scene, streamlines, roi) for roi in scene.rois])
    return roi_fiber_masks


# In[7]:


def tract_to_fiber_mask(tract, streamlines, roi_fiber_masks):
    
    tract_id = int(tract['id']) 
    
    tract_mask = np.ones(len(streamlines), dtype=bool)    
    for roi in tract.findAll("roi"):
        
        if roi['enable'] == "0":
            continue
            
        roi_index = int(roi['id'])
        operator = roi['operator']
        if operator == 'and':
            tract_mask = np.logical_and(tract_mask, roi_fiber_masks[roi_index])
        elif operator == 'or':
            tract_mask = np.logical_or(tract_mask, roi_fiber_masks[roi_index])
        elif operator == 'not':
            tract_mask = np.logical_and(tract_mask, np.logical_not(roi_fiber_masks[roi_index]))
            
    return tract_id, tract_mask


# In[8]:


def extract_tract_fiber_masks(scene, streamlines, roi_fiber_masks):
    tract_fiber_masks = dict([tract_to_fiber_mask(tract, streamlines, roi_fiber_masks) for tract in scene.tracts])
    return tract_fiber_masks


# ## Отрисовываем

# In[9]:


def draw_tract(tract, tract_fiber_masks, streamlines, voxel_size, simplified):
    if tract.visibility['value'] == '0':
        return
    
    tract_id = int(tract['id']) 
    tract_mask = tract_fiber_masks[tract_id]
    tract_color = tuple(float(tract.solidcolor[c])/255 for c in ("r","g","b"))
    radius = float(tract.radius['value']) * voxel_size
    
    for line_ind in np.nonzero(tract_mask)[0]:
        streamline = streamlines[line_ind]
        if simplified:
            streamline = rdp(streamline, epsilon=1)
        x = streamline[:, 0]
        y = streamline[:, 1]
        z = streamline[:, 2]
        mlab.plot3d(x, y, z, color=tract_color, tube_radius=radius)    


# In[10]:


def draw_tracts(scene, tract_fiber_masks, streamlines, voxel_size, simplified):
    for tract in scene.tracts:
        draw_tract(tract, tract_fiber_masks, streamlines, voxel_size, simplified)


# In[11]:


def draw_roi(scene, roi):
    
    if roi.visibility['value'] == '0':
        return
    
    roi_type = roi['type'] 
    if roi_type != 'FromImage':
        return
    
    voxel_size = scene.voxel_size
    roi_fpath = path.join(scene.dir, roi.imagefile['rpath'])
    roi_voxel_mask = nibabel.load(roi_fpath).get_data()
    roi_opacity = float(roi.opacity['value'])
    roi_color = tuple(float(roi.color[c])/255 for c in ("r","g","b"))
    
    verts, faces, normals, values = measure.marching_cubes_lewiner(roi_voxel_mask, level=0, spacing=tuple(voxel_size))
    
    mlab.triangular_mesh(verts[:, 0], verts[:, 1], verts[:, 2], faces, opacity=roi_opacity, color=roi_color)  


# In[12]:


def draw_rois(scene):
    for roi in scene.rois:
        draw_roi(scene, roi)


# ## Вызываем всё

# In[13]:


def tracts_visualisation(full_path_scene, width=600, height=600, simplified=True):
    mlab.init_notebook(width=width, height=height)
    
    def nb_print(s):
        print(s)
        sys.stdout.flush()
    
    scene = parse_scene(full_path_scene)
    nb_print('Parsed the scene')
    
    streamlines = extract_fibers(scene)
    print('Extracted the fibers')
    
    roi_fiber_masks = extract_roi_fiber_masks(scene, streamlines)
    print('Found out which fibers go through which ROI')
    
    tract_fiber_masks = extract_tract_fiber_masks(scene, streamlines, roi_fiber_masks)
    print('Combined ROIs to find which fibers belong to each tract')
    
    print('Now drowing enabled tracts')
    voxel_size = scene.voxel_size[0]
    draw_tracts(scene, tract_fiber_masks, streamlines, voxel_size, simplified)
    draw_rois(scene)
    mlab.view(focalpoint=scene.dimensions/2)  



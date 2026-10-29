import time
from typing import Tuple, List, Dict, Any
import numpy as np 

DEFAULT_SCATTER_THRESHOLD = 10000

def bin_2d(x: list, y: list, n_bins: int=50, min_count: int=1):
    """
    2D Binning

    :param x: x coordinates
    :param y: y coordinates
    :param n_bins: number of bins
    :param min_count: minimum count
    :return: binned data
    """ 

    start_time = time.perf_counter()

    if len(x) == 0:
        return [], [],[],{
            "binned": False,
            "algorithm": "histogram2d",
            "points_count": 0,
            "original_points": 0,
            "execution_time_ms": 0.0,
        }
    
    x_arr = np.asarray(x, dtype=np.float64)
    y_arr = np.asarray(y, dtype=np.float64)

    valid_mask = np.isfinite(x_arr) & np.isfinite(y_arr)

    x_arr = x_arr[valid_mask]
    y_arr = y_arr[valid_mask]

    if len(x_arr) == 0:
        return [],[],[], {
            "binned": False,
            "algorithm": "histogram2d",
            "points_count": 0,
            "original_points": len(x),
            "execution_time_ms": 0.0,
        }
    
    H, x_edges, y_edges = np.histogram2d(x_arr, y_arr, bins=n_bins)
    
    x_centers = (x_edges[:-1] + x_edges[1:]) / 2.0
    y_centers = (y_edges[:-1] + y_edges[1:]) / 2.0

    ix, iy = np.where(H >= min_count)

    sampled_x = x_centers[ix].tolist()
    sampled_y = y_centers[iy].tolist()
    counts = H[ix, iy].astype(int).tolist()

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    meta_info = {
        "binned": True,
        "algorithm": "histogram2d",
        "n_bins": n_bins,
        "original_points": len(x),
        "points_count": len(sampled_x),
        "max_density": max(counts) if counts else 0,
        "execution_time_ms": duration_ms,
    }

    return (sampled_x, sampled_y, counts, meta_info)

# CONCLUSION:  Plotly rendering of hv.Scatter3D looks really nice. But I think Plotly should be used in a Jupyter notebook, not a standalone script.
#       Its HTML rendering is poor; it's limited to 1000 points.
#           (Wait is that true?? I see at least one HTML render that isn't that way: file:///Users/herdrick/repos/chaos-game/desktop/chaos-game-scatter3d_plot.html)
#               in any case it might be quite limited because each point is included in the HTML file.
#       Also getting Plotly and Holoviews working together requires some tricky downgrading of some packages.
#   OK maybe Plotly could be used (see above for doubts about limit on points) but so far it seems to keep sucking in effort.


# conda install -c conda-forge jupyter holoviews plotly datashader pyarrow
# conda install -c conda-forge "dask-core<2023.8.0" "datashader>=0.15.1,<0.17" "holoviews>=1.15.4,<1.21" (per advice of https://chatgpt.com/c/67933be1-2f68-8011-a596-83cbc18bc0c8 )
import holoviews as hv
import numpy as np
import plotly.io as pio
hv.extension('plotly')

#hv.extension('matplotlib')  # Enable Matplotlib backend

# Generate random 3D points
np.random.seed(42)
x = np.random.rand(10000)
y = np.random.rand(10000)
z = np.random.rand(10000)

#points = hv.Points(zip(x, y, z), kdims=['X', 'Y', 'Z'], vdims=[])   # nope, Points are 2D only
'''
# Create a 3D scatter plot
scatter3d = hv.Scatter3D((x, y, z), kdims=['X', 'Y', 'Z'], vdims=[]).opts(
    size=10, color='blue', fig_size=200
)

scatter3d
'''


# Use Scatter3D with the Plotly backend
scatter3d = hv.Scatter3D((x, y, z), kdims=['X', 'Y', 'Z']).opts(
    size=1,  # Works with Plotly
    color='blue'
)

# Render to Plotly object
plotly_fig = hv.render(scatter3d, backend='plotly')

# Save as an HTML file
pio.write_html(plotly_fig, file="scatter3d_plot.html", auto_open=True)

print("Scatter3D plot saved to 'scatter3d_plot.html'")

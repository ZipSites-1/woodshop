; Woodshop GRBL program cabinet_rev0003
G90 ; absolute positioning
G21 ; millimeters
G17 ; XY plane
G0 Z5.000
G0 X0 Y0
; Toolpath: Door Left (contour)
G0 X10.000 Y10.000
G1 Z-3.000 F600.0
G1 X1010.000 F1600.0
G1 Y710.000
G1 X10.000
G1 Y10.000
G0 Z5.000
G0 X0 Y0
M5
G0 Z5.000
G0 X0 Y0
M30

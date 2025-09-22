; Woodshop GRBL program prog_ea3f3688d2
G90 ; absolute positioning
G21 ; millimeters
G17 ; XY plane

; Toolpath: profile (contour)
G0 Z6
G0 X0
G1 Z-48 F600
G1 X4800 F1800
G0 Z6

; Toolpath: dowels (drill)
G0 Z6
G0 X0
G1 X36 F480
G4 P0.15

M5 ; spindle stop
G0 Z6
G0 X0 Y0
M30 ; program end

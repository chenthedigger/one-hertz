#!/bin/zsh
# P6 demo-reel assembly — cuts the continuous take on the beat marks
# (video time ≈ mark + ~0.8s), crossfades the two hard jumps + one interior
# descent trim, white fade in/out, H.264 faststart.
set -e
FF=~/.local/bin/ffmpeg
IN=/Users/simon/engineer/one-hertz/docs/media/.takes/take-desktop.webm
OUT=/Users/simon/engineer/one-hertz/docs/media/demo-reel.mp4

# a: loader tail -> match cut -> hero hold -> descent start   [6.0..13.6]  7.6s
# b: VerticalText -> Disassembly arrival -> fan open -> pulse [15.6..26.5] 10.9s
# c: Nocturne AOD drift                                       [29.4..33.9] 4.5s
# d: outro lineup -> select BLACK DLC -> SWAP -> restart      [36.4..45.0] 8.6s
$FF -hide_banner -loglevel warning -y -i "$IN" -filter_complex "
[0:v]trim=start=4.8:end=13.4,setpts=PTS-STARTPTS[a];
[0:v]trim=start=16.2:end=26.5,setpts=PTS-STARTPTS[b];
[0:v]trim=start=29.4:end=33.7,setpts=PTS-STARTPTS[c];
[0:v]trim=start=36.6:end=45.0,setpts=PTS-STARTPTS[d];
[a][b]xfade=transition=fade:duration=0.5:offset=8.1[ab];
[ab][c]xfade=transition=fade:duration=0.5:offset=17.9[abc];
[abc][d]xfade=transition=fade:duration=0.5:offset=21.7[abcd];
[abcd]fade=t=in:st=0:d=0.4:color=white,fade=t=out:st=29.5:d=0.6:color=white,format=yuv420p[v]
" -map "[v]" -c:v libx264 -preset slow -crf 21 -r 25 -movflags +faststart "$OUT"
ls -la "$OUT"

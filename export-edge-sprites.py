"""Render the hero edge characters as 8-frame sprite sheets from the native peek view.

Usage: python3 export-edge-sprites.py /path/to/Twigly/MacOS /path/to/Twigly/assets/animations
Only reads source/artwork. No app store, account, clipboard or network access.

Each animation frame replaces the upper (peeking) part of the original portrait,
then goes through the same foreground cleanup, crop, rotation, scale and mirroring
as `native-edge-*.png`. The crop and scale are fixed from the original portrait,
so moving ears never resize or shift the character between frames.
Frames are placed left to right in one lossless PNG per character and side.
"""
from pathlib import Path
import json
import re
import subprocess
import sys
import tempfile

# Keep in sync with the hero `placements` in dist/app.js (ability → character).
HERO = {'left': [0, 8, 16, 18, 4], 'right': [1, 21, 6, 12, 22]}
FRAMES = 8

website = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve() / 'Sources/DeskForest'
animations = Path(sys.argv[2]).resolve()
out = website / 'dist/assets'
read = lambda name: (source / name).read_text()

report = (animations / 'compare.html').read_text()
report = json.loads(re.search(r'<script id="report" type="application/json">(.*?)</script>', report, re.S).group(1))
frames = {}
for item in report:
    names = item['frameNames']
    assert len(names) == FRAMES, item['slug']
    frames[item['id']] = {
        'paths': [str(animations / item['slug'] / 'frames' / name) for name in names],
        # Frame pixel (0,0) sits at -shift in the original portrait's pixel grid.
        'origin': [-item['shift'][0], -item['shift'][1]],
        # Rows above this line (top of the alpha box + crop height) come from the frame.
        'cut': item['bbox'][1] + item['cropHeight'],
        'sourceSize': item['sourceSize'],
    }

def replace(text, old, new):
    assert old in text, old
    return text.replace(old, new)

models = read('Models.swift')
character = models[models.index('struct Character:'):models.index('enum Ability:')]
catalog = read('CharacterCatalogView.swift')
catalog = catalog[catalog.index('@MainActor\nenum CatalogPortraits'):]
# Keep the full cleaned canvas for animation frames; the crop comes from the original.
catalog = replace(catalog, 'private static var cache:[Int:NSImage]=[:]', 'private static var cache:[Int:NSImage]=[:]\n    static var keepCanvas=false\n    static var lastCrop=CGRect.zero')
catalog = replace(catalog, 'result=full.cropping(to:CGRect(x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1))',
                  'lastCrop=CGRect(x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1)\n            result=keepCanvas ? full:full.cropping(to:lastCrop)')
peek = read('PeekEdgeCharacter.swift')
peek = replace(peek, 'Image(nsImage:artwork.image).resizable().interpolation(.none)', 'EdgeFrameImage(size:layout.originalSize)')
peek = replace(peek, 'let artwork=CharacterArtworkLibrary.peek(character)', '')
prefix = '''import SwiftUI
import AppKit
import Foundation
enum DesktopEdge {case left,right}
enum DesktopEdgeLayout {static let characterSize:CGFloat=49.5*1.05*1.05*1.10}
@MainActor enum CharacterImages {
 static func load(_ name:String)->NSImage {
  NSImage(contentsOfFile:ASSET_ROOT+"/"+name+".png")!
 }
}
@MainActor enum EdgeFrame {
 static var image=NSImage()
 static var padding:CGFloat=0
}
// The padded frame is centered on the original crop, so moving ears beyond that
// crop stay visible until the peek view's own clip. The padding is chosen as a
// near-whole number of output pixels to keep the original pixel grid.
struct EdgeFrameImage:View {
 let size:CGSize
 var body:some View {
  let image=EdgeFrame.image,pad=EdgeFrame.padding,k=size.width/(image.size.width-pad*2)
  Image(nsImage:image).resizable().interpolation(.none)
   .frame(width:image.size.width*k,height:image.size.height*k)
   .frame(width:size.width,height:size.height)
 }
}
'''.replace('ASSET_ROOT', json.dumps(str(source / 'Resources/Characters')))
export = '''
let FRAMES:[String:[String:Any]]=FRAME_DATA
let HERO=HERO_DATA
func cgImage(_ path:String)->CGImage {
 let image=NSImage(contentsOfFile:path)!
 return image.cgImage(forProposedRect:nil,context:nil,hints:nil)!
}
// Original portrait with everything above `cut` replaced by one animation frame.
func composite(_ id:Int,_ frame:Int)->NSImage {
 let info=FRAMES[String(id)]!
 let original=cgImage(CharacterImages_path(id))
 let width=original.width,height=original.height
 let context=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 context.interpolationQuality = .none
 context.draw(original,in:CGRect(x:0,y:0,width:width,height:height))
 let cut=CGFloat((info["cut"] as! Int)),top=CGRect(x:0,y:CGFloat(height)-cut,width:CGFloat(width),height:cut)
 context.clear(top)
 context.clip(to:top)
 let image=cgImage((info["paths"] as! [String])[frame])
 let origin=info["origin"] as! [Int]
 context.draw(image,in:CGRect(x:CGFloat(origin[0]),y:CGFloat(height-origin[1]-image.height),width:CGFloat(image.width),height:CGFloat(image.height)))
 let result=context.makeImage()!
 return NSImage(cgImage:result,size:CGSize(width:width,height:height))
}
func CharacterImages_path(_ id:Int)->String {SOURCE_ROOT+"/"+String(format:"front-%02d",id)+".png"}
@MainActor func render<V:View>(_ view:V)->CGImage {
 let renderer=ImageRenderer(content:view.environment(\\.colorScheme,.light))
 renderer.scale=3
 guard let image=renderer.cgImage else {fatalError("Failed to render")}
 return image
}
func rgba(_ image:CGImage)->[UInt8] {
 var bytes=[UInt8](repeating:0,count:image.width*image.height*4)
 let context=CGContext(data:&bytes,width:image.width,height:image.height,bitsPerComponent:8,bytesPerRow:image.width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 context.draw(image,in:CGRect(x:0,y:0,width:image.width,height:image.height))
 return bytes
}
func changedPixels(_ a:CGImage,_ b:CGImage)->Int {
 let x=rgba(a),y=rgba(b)
 guard x.count==y.count else{return Int.max}
 return stride(from:0,to:x.count,by:4).filter{i in (0..<4).contains{abs(Int(x[i+$0])-Int(y[i+$0]))>8}}.count
}
// Cleaned canvas with transparent padding around the original crop.
func padded(_ canvas:NSImage,crop:CGRect,pad:Int)->NSImage {
 let source=canvas.cgImage(forProposedRect:nil,context:nil,hints:nil)!
 let width=Int(crop.width)+pad*2,height=Int(crop.height)+pad*2
 let context=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 context.interpolationQuality = .none
 context.draw(source,in:CGRect(x:CGFloat(pad)-crop.minX,y:CGFloat(height-pad)+crop.minY-CGFloat(source.height),width:CGFloat(source.width),height:CGFloat(source.height)))
 return NSImage(cgImage:context.makeImage()!,size:CGSize(width:width,height:height))
}
@MainActor func cell(_ c:Character,_ edge:DesktopEdge,_ image:NSImage,pad:Int)->CGImage {
 let size=DesktopEdgeLayout.characterSize
 EdgeFrame.image=image;EdgeFrame.padding=CGFloat(pad)
 return render(PeekEdgeCharacter(character:c,edge:edge).frame(width:size,height:size))
}
@MainActor func run() throws {
 for (side,ids) in HERO {
  let edge:DesktopEdge = side == "left" ? .left:.right
  for id in ids {
   let c=Character.all[id]
   // Fix the crop from the unmodified portrait, exactly as the static edge image.
   CatalogPortraits.keepCanvas=true
   let original=CatalogPortraits.foreground(from:CharacterImages.load(c.portrait))
   let crop=CatalogPortraits.lastCrop
   // Without padding this is the static edge image. Pick the padding whose
   // render of the unmodified portrait stays closest to that pixel grid.
   let reference=cell(c,edge,padded(original,crop:crop,pad:0),pad:0)
   var best=(pad:0,changed:Int.max)
   for pad in 8...40 {
    let changed=changedPixels(reference,cell(c,edge,padded(original,crop:crop,pad:pad),pad:pad))
    if changed<best.changed {best=(pad,changed)}
    if changed==0 {break}
   }
   var cells:[CGImage]=[]
   for frame in 0..<FRAMES_PER_SHEET {
    cells.append(cell(c,edge,padded(CatalogPortraits.foreground(from:composite(id,frame)),crop:crop,pad:best.pad),pad:best.pad))
   }
   let width=cells[0].width,height=cells[0].height
   let sheet=CGContext(data:nil,width:width*cells.count,height:height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
   sheet.interpolationQuality = .none
   for (index,image) in cells.enumerated() {
    precondition(image.width==width && image.height==height)
    sheet.draw(image,in:CGRect(x:index*width,y:0,width:width,height:height))
   }
   let name="native-edge-sprite-"+side+"-"+String(format:"%02d",id)
   let data=NSBitmapImageRep(cgImage:sheet.makeImage()!).representation(using:.png,properties:[:])!
   try data.write(to:URL(fileURLWithPath:OUTPUT_ROOT+"/"+name+".png"))
   print(name,"\(width*cells.count)x\(height)","padding",best.pad,"first-frame pixels off the static grid",best.changed)
  }
 }
}
try MainActor.assumeIsolated {try run()}
'''
export = (export.replace('FRAME_DATA', json.dumps({str(k): v for k, v in frames.items()}).replace('{', '[').replace('}', ']'))
          .replace('HERO_DATA', json.dumps(HERO).replace('{', '[').replace('}', ']'))
          .replace('FRAMES_PER_SHEET', str(FRAMES))
          .replace('SOURCE_ROOT', json.dumps(str(source / 'Resources/Characters')))
          .replace('OUTPUT_ROOT', json.dumps(str(out))))
swift = prefix + character + read('CharacterArtwork.swift') + catalog + peek + export
with tempfile.TemporaryDirectory(prefix='twigly-edge-sprite-export-') as scratch:
    script = Path(scratch) / 'export.swift'
    script.write_text(swift)
    subprocess.run(['swift', '-module-cache-path', str(Path(scratch) / 'cache'), str(script)], check=True)

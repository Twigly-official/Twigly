"""Export a silent gacha preview from native presentation code and sample artwork.

Usage: python3 export-gacha-preview.py /path/to/private/MacOS
Reads only the scene, character definitions and artwork; never launches the app.
"""
from pathlib import Path
import json
import os
import platform
import subprocess
import sys
import tempfile

website = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve() / "Sources/DeskForest"
scene = (source / "GachaCinemaScene.swift").read_text()
models = (source / "Models.swift").read_text()
characters = models[models.index("struct Character:"):models.index("enum Ability:")]
# The timeline-backed idle preview is unused by the deterministic frame export.
start = scene.index("/// Same approved machine,")
end = scene.index("/// The presentation receives", start)
scene = scene[:start] + scene[end:]
# Keep the actual scene, camera, capsule and character reveal. Omit app controls.
start = scene.index("                Button(action: connect)")
end_marker = "                }.buttonStyle(.plain).padding(.top, 5)"
end = scene.index(end_marker, start) + len(end_marker)
scene = scene[:start] + scene[end:]
start = scene.index("            VStack {\n                HStack {\n                    HStack(spacing: 7)")
end_marker = "            }.padding(28)"
end = scene.index(end_marker, start) + len(end_marker)
scene = scene[:start] + scene[end:]

prefix = '''import SwiftUI
import AppKit
import AVFoundation
import CoreVideo
import Foundation
struct OwnedCharacter { let id:Int; var character:Character {Character.all[id]} }
@MainActor enum CharacterImages {
 static func load(_ name:String)->NSImage {
  NSImage(contentsOfFile:ART_ROOT+"/"+name+".png")!
 }
}
'''.replace("ART_ROOT", json.dumps(str(source / "Resources/Characters")))
export = '''
let outputRoot=URL(fileURLWithPath:OUTPUT_ROOT)
@MainActor func frame(_ time:Double)->CGImage {
 let view=GachaCinemaStage(time:time,pet:OwnedCharacter(id:4),reduced:false,
  playing:true,finished:false,connect:{},cancel:{},viewport:CGSize(width:680,height:560))
  .frame(width:680,height:560).environment(\\.colorScheme,.light)
 let renderer=ImageRenderer(content:view);renderer.scale=2
 guard let image=renderer.cgImage else {fatalError("Unable to render gacha scene")}
 return image
}
func writePNG(_ image:CGImage,_ name:String)throws{
 let data=NSBitmapImageRep(cgImage:image).representation(using:.png,properties:[:])!
 try data.write(to:outputRoot.appendingPathComponent(name))
}
@MainActor func run()throws{
 _ = NSApplication.shared
 NSApp.setActivationPolicy(.prohibited)
 let output=outputRoot.appendingPathComponent("native-gacha-cinema.mp4")
 if FileManager.default.fileExists(atPath:output.path){try FileManager.default.removeItem(at:output)}
 let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
 writer.shouldOptimizeForNetworkUse=true
 let width=1360,height=1120,fps:Int32=30,count=216
 let settings:[String:Any]=[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:width,AVVideoHeightKey:height,
  AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:8_000_000,AVVideoMaxKeyFrameIntervalKey:30,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]]
 let input=AVAssetWriterInput(mediaType:.video,outputSettings:settings)
 let adapter=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[
  kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height,
  kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
 writer.add(input);guard writer.startWriting()else{throw writer.error!}
 writer.startSession(atSourceTime:.zero)
 try writePNG(frame(0),"native-gacha-cinema-poster.png")
 for i in 0..<count {
  while !input.isReadyForMoreMediaData {Thread.sleep(forTimeInterval:0.005)}
  try autoreleasepool {
   let time=min(4.8,max(0,Double(i)/Double(fps)-0.35))
   let image=frame(time)
   var buffer:CVPixelBuffer?
   guard CVPixelBufferPoolCreatePixelBuffer(nil,adapter.pixelBufferPool!,&buffer)==kCVReturnSuccess,let buffer else{fatalError("Pixel buffer allocation failed")}
   CVPixelBufferLockBaseAddress(buffer,[])
   let context=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:width,height:height,bitsPerComponent:8,
    bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
   context.draw(image,in:CGRect(x:0,y:0,width:width,height:height))
   CVPixelBufferUnlockBaseAddress(buffer,[])
   guard adapter.append(buffer,withPresentationTime:CMTime(value:Int64(i),timescale:fps))else{throw writer.error!}
  }
  if i%30==0{print("Rendered frame \\(i)/\\(count)")}
 }
 input.markAsFinished()
 let completion=DispatchSemaphore(value:0);writer.finishWriting{completion.signal()};completion.wait()
 guard writer.status == .completed else{throw writer.error!}
 print("Exported 1360x1120, 30fps, silent native gacha preview")
}
try MainActor.assumeIsolated {try run()}
'''.replace("OUTPUT_ROOT", json.dumps(str(website / "dist/assets")))
with tempfile.TemporaryDirectory(prefix="twigly-gacha-preview-") as scratch:
    script = Path(scratch) / "Export.swift"
    script.write_text(prefix + characters + scene + export)
    # Use a compiled executable instead of Swift's JIT for AVFoundation rendering.
    sdk = Path("/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk")
    if not sdk.exists():
        sdk = Path(subprocess.check_output(["xcrun", "--sdk", "macosx", "--show-sdk-path"], text=True).strip())
    environment = dict(os.environ, SDKROOT=str(sdk))
    executable = Path(scratch) / "Export"
    subprocess.run(["swiftc", "-sdk", str(sdk), "-target", platform.machine()+"-apple-macosx14.0", "-module-cache-path", str(Path(scratch) / "cache"), str(script), "-o", str(executable)], check=True, env=environment)
    subprocess.run([str(executable)], check=True, env=environment)

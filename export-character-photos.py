"""Render only gallery photos from the native catalog, without launching the app.

Usage: python3 export-character-photos.py /path/to/private/MacOS
Reads native source and artwork; writes the website's 26 native-photo PNGs only.
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile

website = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve() / 'Sources/DeskForest'
read = lambda name: (source / name).read_text()
models = read('Models.swift')
characters = models[models.index('struct Character:'):models.index('enum Ability:')]
theme = read('Theme.swift')
theme = theme[:theme.index('/// The main window')]
catalog = read('CharacterCatalogView.swift')
catalog = catalog[catalog.index('struct CharacterPortraitPhoto:'):]
prefix = '''import SwiftUI
import AppKit
import Foundation
enum DesktopEdge {case left,right}
enum DesktopEdgeLayout {static let characterSize:CGFloat=49.5*1.05*1.05*1.10}
@MainActor enum CharacterImages {
 static func load(_ name:String)->NSImage {
  NSImage(contentsOfFile:ART_ROOT+"/"+name+".png")!
 }
}
'''.replace('ART_ROOT', json.dumps(str(source / 'Resources/Characters')))
export = '''
@MainActor func run() throws {
 _ = NSApplication.shared
 NSApp.setActivationPolicy(.prohibited)
 NSApp.appearance=NSAppearance(named:.aqua)
 for character in Character.all {
  let view=CharacterPortraitPhoto(character:character).frame(width:84,height:112)
   .environment(\\.colorScheme,.light)
  let renderer=ImageRenderer(content:view);renderer.scale=4
  guard let image=renderer.cgImage else {fatalError("Unable to render catalog photo")}
  let data=NSBitmapImageRep(cgImage:image).representation(using:.png,properties:[:])!
  let filename=String(format:"native-photo-%02d.png",character.id)
  try data.write(to:URL(fileURLWithPath:OUTPUT_ROOT).appendingPathComponent(filename))
 }
 print("Rendered 26 native catalog photos at 336x448")
}
try MainActor.assumeIsolated {try run()}
'''.replace('OUTPUT_ROOT', json.dumps(str(website / 'dist/assets')))
with tempfile.TemporaryDirectory(prefix='twigly-web-photos-') as scratch:
    script = Path(scratch) / 'Export.swift'
    script.write_text(prefix + characters + theme + read('CharacterArtwork.swift')
                      + read('PeekEdgeCharacter.swift') + catalog + export)
    subprocess.run(['swift', '-module-cache-path', str(Path(scratch) / 'cache'), str(script)], check=True)

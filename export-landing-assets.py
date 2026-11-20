"""Render landing artwork from the native macOS views, without launching the app.

Usage: python3 export-landing-assets.py /path/to/Twigly/MacOS
Only reads source/artwork. No app store, account, clipboard or network access.
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile

website = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve() / 'Sources/DeskForest'
out = website / 'dist/assets'
read = lambda name: (source / name).read_text()
models = read('Models.swift')
character = models[models.index('struct Character:'):models.index('enum Ability:')]
catalog = read('CharacterCatalogView.swift')
catalog = catalog[catalog.index('struct CharacterPortraitPhoto:'):]
theme = read('Theme.swift')
theme_parts = theme[:theme.index('struct TrailingSwitchToggleStyle:')]
theme_parts += theme[theme.index('struct Portrait:'):theme.index('struct ToastMessage:')]
theme = theme_parts
gacha = read('GachaView.swift')
assignment = gacha[gacha.index('struct AssignmentView:'):]
# Freeze presentation state and remove event handlers for a read-only image.
assignment = assignment.replace('@State private var chosen:Ability?', 'private let chosen:Ability? = .focus')
assignment = assignment.replace('@State private var confirm=false', '')
assignment = assignment.replace('Button {chosen=ability}', 'Button {}')
assignment = assignment.replace('{confirm=true}', '{}')
assignment = '\n'.join(line for line in assignment.splitlines() if not line.strip().startswith('.alert('))
# ImageRenderer has no on-screen viewport to realize lazy/scroll content.
# Materialize the same two-column cards for the fixed 680px screenshot.
assignment = assignment.replace('ScrollView{', 'VStack(spacing:0){')
assignment = assignment.replace('LazyVGrid(columns:[GridItem(.adaptive(minimum:260))],spacing:10){\n                    ForEach(AssignmentAbilities.displayOrder){ability in abilityCard(ability)}\n                }', 'VStack(spacing:10){ForEach(0..<5,id: \\.self){row in HStack(spacing:10){abilityCard(AssignmentAbilities.displayOrder[row*2]);abilityCard(AssignmentAbilities.displayOrder[row*2+1])}}}')
gacha = gacha[gacha.index('enum GachaDomeLayout'):gacha.index('struct AssignmentView:')]
abilities = models[models.index('enum Ability:'):models.index('enum DesktopEdge:')]
quick = read('QuickPreview.swift')
quick = quick[quick.index('struct CharacterQuickPreview:'):]
quick = quick.replace('@EnvironmentObject var store:AppStore', 'let summary:LandingSummary')
quick = quick.replace('let pet:OwnedCharacter', '')
quick = quick.replace('let summary=store.quickSummary(for:pet)', '')
quick = quick.replace('summary.label ?? pet.ability?.name ?? "연결한 기능"', 'summary.label')
prefix = '''import SwiftUI
import AppKit
import Foundation
enum DesktopEdge {case left,right}
enum DesktopEdgeLayout {static let characterSize:CGFloat=49.5*1.05*1.05*1.10}
enum AppTypography {static func font(size:CGFloat,weight:Font.Weight = .regular)->Font {.system(size:size,weight:weight)}}
struct LandingSummary {let label:String;let value:String;var accessibility:String {label+" "+value}}
struct LandingState {var cloudAccountID:String? = nil}
struct OwnedCharacter {let id:Int;var character:Character {Character.all[id]}}
@MainActor final class AppStore:ObservableObject {
 var state=LandingState()
 func assign(_ id:Int,ability:Ability)->Bool {false}
}
@MainActor final class CloudCollectionStore:ObservableObject {
 var error:String? = nil
 var isWorking=false
 func assign(characterID:Int,ability:Ability) async -> Bool {false}
}
@MainActor enum CharacterImages {
 static func load(_ name:String)->NSImage {
  NSImage(contentsOfFile:ASSET_ROOT+"/"+name+".png")!
 }
}
'''.replace('ASSET_ROOT', json.dumps(str(source / 'Resources/Characters')))
export = '''
@MainActor func export<V:View>(_ view:V,_ name:String,scale:CGFloat=3) throws {
 let renderer=ImageRenderer(content:view.environment(\\.colorScheme,.light))
 renderer.scale=scale
 guard let image=renderer.cgImage else {fatalError("Failed to render "+name)}
 let data=NSBitmapImageRep(cgImage:image).representation(using:.png,properties:[:])!
 try data.write(to:URL(fileURLWithPath:OUTPUT_ROOT+"/"+name+".png"))
}
@MainActor func run() throws {
 for c in Character.all {
  let n=String(format:"%02d",c.id)
  try export(CharacterPortraitPhoto(character:c).frame(width:84,height:112),"native-photo-"+n,scale:4)
  try export(SizedCharacterArtwork(artwork:CharacterArtworkLibrary.portrait(c),bounds:CGSize(width:84,height:96),targetArea:CharacterArtworkLibrary.targetArea(in:CGSize(width:84,height:96))).frame(width:100,height:112),"native-front-"+n)
  for edge in [DesktopEdge.left,.right] {
   try export(PeekEdgeCharacter(character:c,edge:edge).frame(width:DesktopEdgeLayout.characterSize,height:DesktopEdgeLayout.characterSize),"native-edge-"+(edge == .left ? "left-":"right-")+n)
  }
 }
 try export(GachaMachine(draw:{}),"native-gacha")
 try export(GachaMachine(knob:90,outletProgress:1,draw:{}),"native-gacha-result")
 try export(AssignmentView(pet:OwnedCharacter(id:4),availableSize:CGSize(width:680,height:670),close:{}).environmentObject(AppStore()).environmentObject(CloudCollectionStore()),"native-assignment",scale:2)
 try export(HStack(spacing:10){Image(systemName:"leaf.fill").font(.system(size:24)).foregroundColor(Theme.green);Text("Twigly").font(.system(size:26,weight:.bold,design:.rounded)).tracking(-0.7).foregroundColor(Theme.ink)}.padding(2),"twigly-logo")
 try export(CharacterQuickPreview(summary:LandingSummary(label:"집중 시간",value:"25:00")).padding(4),"native-summary-reference")
 print("Rendered 26 gradient photos, 26 portraits, 52 edge poses, native gacha machine, assignment screen and summary reference.")
}
try MainActor.assumeIsolated {try run()}
'''.replace('OUTPUT_ROOT', json.dumps(str(out)))
swift = prefix + theme + character + abilities + read('CharacterArtwork.swift') + catalog + read('PeekEdgeCharacter.swift') + quick + gacha + assignment + export
with tempfile.TemporaryDirectory(prefix='twigly-landing-export-') as scratch:
    script = Path(scratch) / 'export.swift'
    script.write_text(swift)
    subprocess.run(['swift', '-module-cache-path', str(Path(scratch) / 'cache'), str(script)], check=True)

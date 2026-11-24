"""Render the real ToolView used by 위젯 둘러보기, with isolated example data.

Usage: python3 export-feature-previews.py /path/to/Twigly/MacOS
Copies Swift sources to a temporary render target; never launches the installed app.
Account configuration is excluded. AppStore.isolatedPreview has no runtime IO.
"""
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile

native = Path(sys.argv[1]).resolve()
output = Path(__file__).resolve().parent / 'dist/assets/feature-previews'
output.mkdir(parents=True, exist_ok=True)
exporter = r'''
import AppKit
import SwiftUI

@main
struct FeatureSnapshotExporter {
    @MainActor static func main() throws {
        _ = NSApplication.shared
        NSApp.setActivationPolicy(.prohibited)
        let now=ISO8601DateFormatter().date(from:"2026-11-25T10:30:00+09:00")!
        var manifest:[[String:Any]]=[]
        for ability in Ability.allCases {
            try autoreleasepool {
                let store=AppStore.isolatedPreview(for:ability,now:now)
                store.clock={now}
                let petID=WidgetPreviewData.characterID(for:ability)
                let view=ToolView(petID:petID,ability:ability)
                    .environmentObject(store).environment(\.siteIconLoading,false)
                    .environment(\.colorScheme,.light)
                    .frame(width:290).fixedSize(horizontal:false,vertical:true)
                    .padding(12).background(Color.white)
                    .foregroundColor(Theme.ink).tint(Theme.green)
                let host=NSHostingView(rootView:view)
                host.appearance=NSAppearance(named:.aqua)
                host.frame=NSRect(x:0,y:0,width:314,height:1000)
                host.layoutSubtreeIfNeeded()
                let measured=host.fittingSize
                let height=max(120,ceil(measured.height))
                host.frame=NSRect(x:0,y:0,width:314,height:height)
                let window=NSWindow(contentRect:host.frame,styleMask:.borderless,backing:.buffered,defer:false)
                window.isReleasedWhenClosed=false
                window.contentView=host
                host.layoutSubtreeIfNeeded()
                RunLoop.current.run(until:Date().addingTimeInterval(0.25))
                window.displayIfNeeded()
                host.layoutSubtreeIfNeeded()
                let scale:CGFloat=4
                // Preserve AppKit's native layer scales. Forcing every sublayer to
                // 4× drops symbol-only buttons and native picker chevrons.
                host.needsDisplay=true
                host.displayIfNeeded()
                guard let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:Int(314*scale),pixelsHigh:Int(height*scale),bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0) else {fatalError("No bitmap")}
                bitmap.size=NSSize(width:314,height:height)
                host.cacheDisplay(in:host.bounds,to:bitmap)
                guard let data=bitmap.representation(using:.png,properties:[:]) else {fatalError("No PNG")}
                let name=String(format:"feature-%02d@4x.png",ability.rawValue)
                try data.write(to:URL(fileURLWithPath:OUTPUT+"/"+name))
                manifest.append(["id":ability.rawValue,"name":ability.name,"image":name,"width":bitmap.pixelsWide,"height":bitmap.pixelsHigh])
                window.contentView=nil
                window.close()
                print("Rendered \(ability.name): \(bitmap.pixelsWide)×\(bitmap.pixelsHigh)")
            }
        }
        let data=try JSONSerialization.data(withJSONObject:manifest,options:[.prettyPrinted,.sortedKeys])
        try data.write(to:URL(fileURLWithPath:OUTPUT+"/manifest.json"))
    }
}
'''.replace('OUTPUT', json.dumps(str(output)))
with tempfile.TemporaryDirectory(prefix='twigly-feature-render-') as scratch:
    scratch=Path(scratch)
    target=scratch/'Sources/DeskForest'
    target.mkdir(parents=True)
    for file in (native/'Sources/DeskForest').glob('*.swift'):
        text=file.read_text()
        if file.name=='App.swift':
            text=text.replace('@main\nstruct TwiglyApp:', 'struct TwiglyApp:', 1)
        (target/file.name).write_text(text)
    shutil.copytree(native/'Sources/DeskForest/Resources', target/'Resources', ignore=shutil.ignore_patterns('AuthConfiguration.plist'))
    (target/'FeatureSnapshotExporter.swift').write_text(exporter)
    (scratch/'Package.swift').write_text('''// swift-tools-version: 5.9
import PackageDescription
let package=Package(name:"DeskForest",platforms:[.macOS("26.0")],products:[.executable(name:"FeatureSnapshot",targets:["DeskForest"])],targets:[.executableTarget(name:"DeskForest",resources:[.process("Resources")])])
''')
    environment=dict(os.environ, DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer', SDKROOT='/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk', CLANG_MODULE_CACHE_PATH=str(scratch/'clang-cache'))
    subprocess.run(['swift','build','--package-path',str(scratch),'--configuration','debug','--jobs','2','--product','FeatureSnapshot','--disable-sandbox','--cache-path',str(scratch/'cache'),'--config-path',str(scratch/'config'),'--security-path',str(scratch/'security')],check=True,env=environment)
    subprocess.run([str(scratch/'.build/debug/FeatureSnapshot')],check=True,env=environment)

import AppKit
import Foundation
let source = URL(fileURLWithPath: "../MacOS/Sources/DeskForest/Resources/Characters", isDirectory: true)
let target = URL(fileURLWithPath: "dist/assets", isDirectory: true)
try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
for id in 0..<26 {
    let name = String(format: "front-%02d.png", id)
    let data = try Data(contentsOf: source.appendingPathComponent(name))
    let bitmap = NSBitmapImageRep(data: data)!
    var minX = bitmap.pixelsWide, minY = bitmap.pixelsHigh, maxX = 0, maxY = 0
    for y in 0..<bitmap.pixelsHigh {
        for x in 0..<bitmap.pixelsWide {
            if (bitmap.colorAt(x: x, y: y)?.alphaComponent ?? 0) > 0.03 {
                minX = min(minX, x); minY = min(minY, y)
                maxX = max(maxX, x); maxY = max(maxY, y)
            }
        }
    }
    let cropped = bitmap.cgImage!.cropping(to: CGRect(x: minX, y: minY, width: maxX-minX+1, height: maxY-minY+1))!
    let ratio = Double(cropped.width) / Double(cropped.height)
    let height = 360, width = Int(360 * ratio)
    let output = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: output)
    NSGraphicsContext.current?.imageInterpolation = .high
    NSImage(cgImage: cropped, size: NSSize(width: width, height: height)).draw(in: NSRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()
    try output.representation(using: .png, properties: [:])!.write(to: target.appendingPathComponent(name))
}

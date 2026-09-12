from pathlib import Path

file_path = Path("frontend/src/features/consent/index.tsx")
raw = file_path.read_bytes()

# The corrupted byte sequence
bad_marker = b'", "\xe0  gu: [\r\n'
good_marker = '", "कभी बीमित नहीं"] },\n  ],\n  gu: [\n'.encode('utf-8')

if bad_marker in raw:
    print("Found bad marker! Replacing...")
    fixed = raw.replace(bad_marker, good_marker)
    # Test UTF-8 decoding
    text = fixed.decode('utf-8')
    print("Decoded cleanly! Writing back...")
    file_path.write_bytes(fixed)
    print("Done!")
else:
    print("Bad marker not found, searching with slice...")
    idx = raw.find(b'\xe0  gu: [')
    print("Found at:", idx)
    if idx != -1:
        prefix = raw[:idx-3]
        suffix = raw[idx+10:]
        replacement = '", "कभी बीमित नहीं"] },\n  ],\n  gu: [\n'.encode('utf-8')
        fixed = prefix + replacement + suffix
        text = fixed.decode('utf-8')
        file_path.write_bytes(fixed)
        print("Fixed with slice and saved!")

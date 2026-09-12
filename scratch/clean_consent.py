with open('frontend/src/features/consent/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines before: {len(lines)}")
# Line 238 (1-indexed, so index 237) is const PSYCHOMETRIC_QUESTIONS_BY_LANG
# Line 263 (index 262) is '  ]\n'
# Line 264 (index 263) starts with '}रण...'
# Line 310 (index 309) is '}\n'
# Line 311 (index 310) is '\n'
# Line 312 (index 311) is 'export function ConsentPage() {\n'

print("Index 237:", lines[237])
print("Index 262:", lines[262])
print("Index 263:", lines[263][:40])
print("Index 308:", lines[308])
print("Index 309:", lines[309])
print("Index 310:", lines[310])

# Ensure index 262 is '  ]\n'
# We want to close PSYCHOMETRIC_QUESTIONS_BY_LANG at index 263 with '}\n\n' and then resume directly at 'export function ConsentPage() {\n'
new_lines = lines[:263] + ['}\n\n'] + lines[310:]

with open('frontend/src/features/consent/index.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Total lines after: {len(new_lines)}")
print("Cleaned up successfully!")

import os
path = os.path.join(os.path.dirname(__file__), '..', 'app', 'src', 'main', 'java', 'com', 'zaruda', 'app', 'ui', 'post', 'CreatePostViewModel.kt')
with open(path, 'r') as f:
    content = f.read()

old = '''    fun setBrand(value: String) {
        _state.value = _state.value.copy(
            brand = value,
            brandSuggestions = if (value.isBlank()) {
                cur
            } else {
                cur.filter { it.contains(value, ignoreCase = true) }
            }
        )
    }'''
new = '''    fun setBrand(value: String) {
        val cur = _state.value.brandSuggestions
        _state.value = _state.value.copy(
            brand = value,
            brandSuggestions = if (value.isBlank()) cur else cur.filter { it.contains(value, ignoreCase = true) },
        )
    }'''
if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w') as f:
        f.write(content)
    print('replaced')
else:
    print('old pattern not found')
    # debug: print near setBrand
    idx = content.find('fun setBrand')
    if idx >= 0:
        print(repr(content[idx:idx+300]))
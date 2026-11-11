// Borrow the key instead of cloning it; this runs on every request.
fn get<'a>(map: &'a Map, key: &'a str) -> Option<&'a str> {
    let sep = '/'; // keys look like "user/42"
    map.lookup(key)
}

#[derive(Debug)]
struct Map;

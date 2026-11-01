: "${API_KEY:?must be set}"
: "${API_URL:=http://localhost:8080}"

request() {
    local method=${1:?method reqired}
    local path=${2:?path required}
    shift 2

    curl \
        --silent \
        --show-error \
        --fail \
        --request "$method" \
        --header "Content-Type: application/json" \
        --header "Authorization: Bearer ${API_KEY}" \
        "$@" \
        "${API_URL}/api/v1/${path}"
}

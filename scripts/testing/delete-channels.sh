#!/usr/bin/env bash

script_dir=$(dirname "$(realpath "$0")")
source "${script_dir}/common.sh"

MATCHER=${1:-*}

delete_channel() {
    request DELETE "channels/${1}" 1>/dev/null
}

request GET channels | jq -r '.[] | [.id, .name] | join(" ")' | while read -r id name; do
    # shellcheck disable=SC2053
    if [[ $name == $MATCHER ]]; then
        echo "Deleting channel ${name} (id: ${id}) ..."
        delete_channel "$id"
    fi
done

echo "Done."

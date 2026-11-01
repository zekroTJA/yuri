#!/usr/bin/env bash

script_dir=$(dirname "$(realpath "$0")")
source "${script_dir}/common.sh"

N_CHANNELS=${1:-50}
PREFIX=${2:-test}

create_channel() {
    request POST channels \
        --data "{\"name\":\"${PREFIX}-${RANDOM}\"}" 1>/dev/null
}

for i in $(seq "$N_CHANNELS"); do
    echo "Creating channel ${i}/${N_CHANNELS} ..."
    create_channel
done

echo "Done."

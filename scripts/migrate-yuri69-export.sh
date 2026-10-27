#!/usr/bin/env bash
set -eo pipefail

print_usage() {
    echo "usage: ${0##*/} ARCHIVE_FILE [OUTPUT_ARCHIVE]" >&2
    exit 1
}

fatal() {
    echo "error: $*" >&2
    exit 1
}

in_file=$1
out_file=${2:-"${in_file%.tar.gz}-out.tar.gz"}

if [[ -z $in_file ]]; then
    print_usage
fi

if [[ ! -r $in_file ]]; then
    fatal "$in_file is not accessible"
fi

if [[ -f $out_file ]]; then
    fatal "$out_file does already exist"
fi

if [[ $in_file == "$out_file" ]]; then
    fatal "input file (${in_file}) equals output file (${out_file})"
fi

tmp_dir=$(mktemp --directory)

cleanup() {
    echo "Cleaning up ..." >&2
    rm -rf "$tmp_dir"
}
trap cleanup EXIT

echo "Extracting package ..." >&2
tar -C "$tmp_dir" -xzf "$in_file"

echo "Applying migration on meta.json ..." >&2
jq 'map({ name: .uid, created_at: .created_date, tags: .tags })' "${tmp_dir}/meta.json" > "${tmp_dir}/meta.json.new"
rm "${tmp_dir}/meta.json"
mv "${tmp_dir}/meta.json.new" "${tmp_dir}/meta.json"

echo "Packaging new archive ..." >&2
tar -C "$tmp_dir" -czf "$out_file" meta.json sounds

echo "Finished." >&2

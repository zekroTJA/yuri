module.exports.createTable = (tablearray, space) => {
    if (!space)
        space = 2;

    function spaces(numb) {
        let out = '';
        for (let i = 0; i < numb; i++)
            out += ' ';
        return out;
    }

    let maxrowlens = [];
    tablearray.forEach((column, i) => {
        let max = 0;
        column.forEach(box => {
            let boxlen = box.length;
            if (boxlen > max)
                max = boxlen;
        });
        maxrowlens[i] = max;
    });
    
    let lines = [];
    tablearray.forEach((column, c) => {
        column.forEach((box, l) => {
            if (!lines[l])
                lines[l] = box + spaces(maxrowlens[c] - box.length + space);
            else
                lines[l] += box + spaces(maxrowlens[c] - box.length + space);
        });
    });

    return lines.join('\n');
}
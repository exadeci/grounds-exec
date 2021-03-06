var fs = require('fs'),
    path = require('path'),
    FactoryGirl = require('factory_girl');

var languages = !!process.env.LANGUAGE ? [process.env.LANGUAGE] :
[
    'c',
    'cpp',
    'csharp',
    'elixir',
    'golang',
    'haxe',
    'java',
    'node',
    'php',
    'python2',
    'python3',
    'ruby',
    'rust'
];

function loadExamples() {
    var examples = [],
        outputs  = [];

    // Read output files
    var dirPath = path.resolve(__dirname, '../../examples/output'),
        files   = fs.readdirSync(dirPath);

    files.forEach(function(file) {
        var filePath = path.resolve(dirPath, file),
            output   = fs.readFileSync(filePath).toString();

        outputs[file] = output;
    });

    // Read code files
    languages.forEach(function(language) {
        dirPath = path.resolve(__dirname, '../../examples/code', language);
        files   = fs.readdirSync(dirPath);

        files.forEach(function(file) {
            var filePath = path.resolve(dirPath, file),
                code = fs.readFileSync(filePath).toString(),
                key = file.substring(0, file.lastIndexOf('.')),
                example = {
                            title: file,
                            language: language,
                            code: code, output: outputs[key]
                          };

            examples.push(example);
        });
    });
    return examples;
}

FactoryGirl.define('examples', function() {
    this.list = loadExamples();
});

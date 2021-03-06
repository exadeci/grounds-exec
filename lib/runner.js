var util = require('util'),
    http = require('http'),
    utils = require('./utils'),
    stream = require('./stream'),
    EventEmitter = require('events').EventEmitter;

// Required by dockerode to attach to many containers
http.globalAgent.maxSockets = 10000;

var containerOpts  = { Tty: false, Memory: 80000000 },
    maxSizeProgram = 65536,
    runTimeout     = 10000;

function Runner(docker) {
    EventEmitter.call(this);

    this.docker = docker;
    this.state = 'idle';
    this._container = null;
}

util.inherits(Runner, EventEmitter);

Runner.prototype.run = function (language, code) {
    var image = utils.formatImage(this.docker.repository, language),
        cmd   = utils.formatCmd(code);

    if (!image)
        return this._error("Please specify a valid language.");

    if (cmd.length >= maxSizeProgram)
        return this._error("Program too large.");

    var self   = this,
        stdout = new stream.WritableStream(),
        stderr = new stream.WritableStream();

    stdout.on('data', function(data) {
        self._write("stdout", data);
    });

    stderr.on('data', function(data) {
        self._write("stderr", data);
    });
    this._runContainer(image, cmd, stdout, stderr);
};

Runner.prototype._runContainer = function(image, cmd, stdout, stderr) {
    var self = this;
    this.docker.run(image, cmd, [stdout, stderr], containerOpts, function(err, data, container) {
        if (err) return self._error(err);

        if (self.state !== 'timeout') {
            self.state = 'finished';
            self._write('status', utils.formatStatus(data.StatusCode));
        }

        container.remove(function(err, data) {});

    }).on('container', function(container) {
        if (!container) return;

        self._container = container;
        self.state = 'started';
        self._write('start', '');

        setTimeout(function() {
            if (self.state === 'finished') return;

            self.state = 'timeout';
            self.stop();
            self._error('Timeout exceeded.');
        }, runTimeout);
    });;
};

Runner.prototype.stop = function() {
    if (!this._container) return;

    this._container.stop(function(err, data) {});
};

Runner.prototype._write = function(stream, chunk) {
    this.emit('output', { stream: stream, chunk: chunk });
};

Runner.prototype._error = function(error) {
    this._write('error', error);
};

module.exports = Runner;

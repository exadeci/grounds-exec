var moment = require('moment'),
    logger = require('./logger'),
    Runner = require('./runner');

// Spam delay prevention in seconds
var spamDelay = 0.5;

function Connection(socket, docker) {
    this.socket = socket;
    this.docker = docker;
    this._runner = null;

    this._lastRunTime = moment().subtract(spamDelay * 2, 'second');
    this._replyToRun = this._getReplyToRun(socket);
}

Connection.prototype.bindEvents = function() {
    var self = this;
    this.socket.on('run', function(data) {
        var newRunTime = moment(),
            lastRunTime = self._lastRunTime;

        if (lastRunTime.add(spamDelay, 'second') < newRunTime)
            self._run(data);
        else {
            self._replyToRun({stream: 'ignored', chunk: ''});
            logger.log('Ignoring run request (spam prevention)...');
        }
        self._lastRunTime = newRunTime;
    });
};

Connection.prototype._run = function(data) {
    if (!data || !data.language)
        return this._replyToRun({ stream: 'error', chunk: 'Bad request.'});
    logger.log('Treating run request:', data.language + '\n' + data.code);

    if (this._runner) {
        this._runner.removeListener('output', this._replyToRun);
        this._runner.stop();
    }

    this._runner = new Runner(this.docker);
    this._runner.on('output', this._replyToRun);
    this._runner.run(data.language, data.code || '');
};

Connection.prototype._getReplyToRun = function(socket) {
    return function (data) {
        if (data.stream === 'error') {
            if (typeof(data.chunk) !== 'string') {
                logger.error(data.chunk.json);
                data.chunk = 'An error has occured.';
            } else {
                logger.error(data.chunk);
            }
        }
        logger.log('Replying to run:', data.stream, '-', data.chunk);
        socket.emit('run', data);
    }
};

module.exports = Connection;

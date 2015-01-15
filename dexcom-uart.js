/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module) {
	var lib = __webpack_require__(1);
	module.exports = lib;

	if (!module.parent) {
	  console.log('gah');
	}

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2)(module)))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	
	var EventEmitter = __webpack_require__(6).EventEmitter;
	var Binary = __webpack_require__(7);
	var chainsaw = __webpack_require__(8);
	var es = __webpack_require__(10);
	var message = __webpack_require__(3);
	var packets = __webpack_require__(5);
	var streamify = __webpack_require__(4);

	function create (master, opts) {
	  var self = new EventEmitter;
	  var incoming = es.through( );
	  master.pipe(incoming);

	  function process (command, cb) {
	    var msg = message.command(command);
	    var bs = Binary(incoming);
	      bs.tap(function ( ) {
	        msg.write(master);
	      })
	      .tap(message.respond)
	      .tap(function (vars) {
	        if (command.response) {
	          this.tap(command.response);
	        }
	        cb(null, vars);
	        incoming.removeAllListeners( );
	    }).end( );
	  }

	  self.createRangedEGVStream = function createRanged (frame, start, stop) {
	    var cur = stop;
	    var stream = es.through( );
	    frame
	      .tap(function ( ) {
	      this.loop(function (end) {
	        console.log("EACH PAGE", cur, start, stop, arguments);
	        console.log('ASKING FOR PAGE', cur);
	        this.readEGVPage(cur, function onPage (err, page) {
	          console.log('got page writing', err, page.json.length, 'entries');
	          var json = page.json.slice( );
	          json.reverse( );
	          json.forEach(function (el) { stream.write(el) });
	          this.tap(function ( ) {
	            console.log('should quit?', cur < start);
	            if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
	            cur--;
	            console.log('asking for another', cur, start, stop);
	          });
	        })
	        ;
	      });
	    })
	    return stream;
	  };

	  var api = chainsaw(function chain (saw) {
	    // this.process = process;
	    this.send = function send (op) {
	      master.write(message.command(op).buffer( ), function written (err, stat) {
	        console.log("WRITTEN", arguments);
	        saw.next( );
	      });
	    }
	    this.recv = function recv (command, cb) {
	      var self = this;
	      var bs = Binary(incoming);
	        bs
	          .tap(message.respond)
	          .tap(function (vars) {
	            if (command.response) {
	              this.tap(command.response);
	            }
	            if (cb && cb.call) {
	              // cb.call(self, null, vars);
	              saw.nest(cb, null, vars);
	            }
	            incoming.removeAllListeners( );
	            // end( );
	            // saw.next( );
	          }).end( );
	      // saw.nest(false, function ( ) { });
	    }
	    this.operate = function proc (oper, cb) {
	      // var end = saw.next;
	      saw.nest(false, function ( ) {
	        this.send(oper)
	          .recv(oper, cb)
	          // .sleep(30)
	          // .tap(end)
	          .tap(saw.next)
	          ;
	      });
	    }
	    this.tap = function tap (cb) {
	      saw.nest(cb);
	    }
	    this.loop = function wrap_loop (cb) {
	      var end = false;
	      saw.nest(false, function looper ( ) {
	        cb.call(this, function fin ( ) {
	          end = true;
	        });
	        this.tap(function ( ) {
	          if (end) saw.next( );
	          else looper.call(this);
	        });
	      });
	    };
	    this.old_operate = function operate (op, cb) {
	      console.log('XXYY op', op);
	      var end = saw.next;
	      var that = this;
	      process(op, function handle (err, results) {
	        cb.call(that, err, results);
	        setTimeout(end, 250);
	      });
	    }

	    packets.call(this, message, saw);

	    this.sleep = function sleep (n) {
	      var now = Date.now( );
	      console.log('sleeping', now - now);
	      function next ( ) {
	        console.log('resuming', Date.now( ) - now);
	        saw.next( );
	      }
	      setTimeout(next, n);
	    }

	    this.close = function close ( ) {
	      if ('close' in master) {
	        master.close( );
	      }
	      if ('end' in master) {
	        master.end( );
	      }
	      master.emit('end');
	      self.emit('end');
	      saw.next( );
	    }
	  });
	  self.api = api;
	  return self;
	}

	create.streamify = streamify;
	module.exports = create;



/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, module) {
	var Put = __webpack_require__(12);
	var crc = __webpack_require__(14);
	var EventEmitter = __webpack_require__(6).EventEmitter;
	var consts = __webpack_require__(9);

	function responder ( ) {
	  return this.word8('SYNC')
	  .tap(function (vars) {
	    // console.log('found SYNC', vars);
	    if (vars.SYNC == 0x01) {
	      this
	        .word16le('total')
	        .tap(function (vars){
	          vars.size = vars.total - 6;
	        })
	        .word8('op')
	        .buffer('data', 'size')
	        .tap(function (vars) {
	          this
	            .into('crc', function (check) {
	              this
	              .word16le('observed')
	              var msg = Put( )
	                .word8(vars.SYNC)
	                .word16le(vars.total)
	                .word8(vars.op)
	                .put(vars.data)
	                ;
	              check.expected = crc.crc16ccitt(msg.buffer( ), 0);
	            })
	            ;
	        })
	        .tap(function check (vars) {
	          vars.crc.ok = vars.crc.expected == vars.crc.observed;
	        })
	        ;
	    }
	  })
	  ;

	}
	function message (opts) {
	  var self = new EventEmitter;
	  self.opts = opts;
	  self.op = opts.op;
	  self.name = opts.name;
	  self.params = function params (input) {
	    if (opts.params && opts.params.call) {
	      return opts.params.apply(self, arguments);
	    }
	    return new Buffer('');
	  };

	  if(opts && opts.call) {
	    self.decode = opts;
	  }
	  return self;
	}

	function install (command, saw) {
	  if (command.name && command.call && command.op) {
	    var msg = message(command);
	    this[command.name] = function oper (cb) {
	      var args = [ ].slice.call(arguments);
	      cb = args.pop( );
	      msg.payload = msg.params.apply(msg, args);
	      console.log('sending', command.name, command.op);
	      this.operate(msg, function answer (err, results) {
	        cb.call(this, err, msg.decode(results));
	        // saw.next( );
	      });
	    }
	  }
	}

	function command (opts) {
	  opts = opts || { };
	  var my = {
	    SYNC: ('sync' in opts) ? opts.sync : 0x01
	  , payload: opts.payload || new Buffer('')
	  , op: opts.op || 10
	  };
	  var msg = Put( )
	    .word8(my.SYNC)
	    .word16le(my.payload.length + 6)
	    .word8(my.op)
	    .put(my.payload)
	    ;
	  msg.word16le(crc.crc16ccitt(msg.buffer( ), 0));
	  return msg;
	}

	message.respond = responder;
	message.command = command;
	message.install = install;
	module.exports = message;

	if (!module.parent) {
	  var c = command( );
	  console.log();
	}

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer, __webpack_require__(2)(module)))

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var es = __webpack_require__(10);

	function streamifyRanged (pager) {
	  function streamered (frame, start, stop) {
	    var stream = es.through( );
	    var cur = stop;
	    frame.tap(function ( ) {
	      this.loop(function (end) {
	        this[pager](cur, function onPage (err, page) {
	          var json = page.json.slice( );
	          json.reverse( );
	          json.forEach(function (el) { stream.write(el) });
	          this.tap(function ( ) {
	            console.log('should quit?', cur < start);
	            if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
	            cur--;
	            console.log('asking for another', cur, start, stop);
	          });
	        });
	      });
	    });

	    return stream;
	  }
	  return streamered
	}

	streamifyRanged.EGV = streamifyRanged('readEGVRecord');
	streamifyRanged.Sensor = streamifyRanged('readSensorData');
	streamifyRanged.CalSet = streamifyRanged('readCalSet');
	streamifyRanged.Deviations = streamifyRanged('Deviations');
	streamifyRanged.Insertions = streamifyRanged('Insertions');
	streamifyRanged.ReceiverLog = streamifyRanged('ReceiverLog');
	streamifyRanged.ReceiverError = streamifyRanged('ReceiverError');
	streamifyRanged.Meter = streamifyRanged('Meter');
	streamifyRanged.UserEvent = streamifyRanged('UserEvent');
	streamifyRanged.UserSettings = streamifyRanged('UserSettings');
	module.exports = streamifyRanged;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {
	function ping (vars) {
	  return vars;
	}
	ping.op = 10;

	function readFirmwareHeader (vars) {
	  return vars.data.toString( );
	}
	readFirmwareHeader.op = 11;

	function readFirmwareSettings (vars) {
	  return vars.data.toString( );
	}
	readFirmwareSettings.op = 54;

	function readHardwareBoard (vars) {
	  return vars.data.toString( );
	}
	readHardwareBoard.op = 49;



	var binary = __webpack_require__(7);
	var put = __webpack_require__(12);
	function ReadDatabasePageRange (vars) {
	  console.log(vars);
	  return binary.parse(vars.data)
	    .word32lu('start')
	    .word32lu('end')
	    .vars
	    ;
	}

	ReadDatabasePageRange.params = function (opts) {
	  return put( )
	    .word8(opts.type)
	    .buffer( )
	    ;
	};
	ReadDatabasePageRange.op = 16


	function ReadPage (vars) {
	  vars = PageHead(vars);
	  vars.bytes = vars.data.length;
	  var handler = iter(vars);
	  if (handler && handler.call) {
	    vars.json = handler( );
	    vars.found = vars.json.length;
	  }
	  return vars;
	}
	ReadPage.params = function (opts) {
	  return put( )
	    .word8(opts.type)
	    .word32le(opts.page || 0)
	    .word8(1)
	    .buffer( )
	    ;
	}
	ReadPage.op = 17

	function ReadPageHeader (vars) {
	  return PageHead(vars);
	}
	ReadPageHeader.params = function (opts) {
	  return put( )
	    .word8(opts.type)
	    .word32le(opts.page || 0)
	    .word8(1)
	    .buffer( )
	    ;
	}
	ReadPageHeader.op = 18


	var suite = [ ping
	  , readFirmwareSettings
	  , readFirmwareHeader
	  , readHardwareBoard
	  , __webpack_require__(11)
	  , ReadDatabasePageRange
	  , ReadPageHeader
	  , ReadPage
	];

	function PageHead (vars) {
	  // var head_length = 32;
	  // var head_length = 28;
	  // var head_length = 30;
	  var head_length = 28;
	  var page = binary.parse(vars.data)
	    .word32le('index')
	    .word32le('numrec')
	    .word8('type')
	    .word8('revision')
	    .word32le('pageNumber')
	    .word32le('r2')
	    .word32le('r3')
	    .word32le('r4')
	    .word16le('headCRC')
	    .buffer('data', vars.size - head_length)
	    .word16le('pageCRC')
	    .buffer('remainder', 1024)
	    ;
	  vars.head = page.vars;
	  // vars.page = page;
	  return vars
	}

	function iter (vars) {
	  var type = vars.head.type;
	  var raw = vars.head.data;
	  var bs = binary.parse(vars.head.data);
	  var list = [ ];
	  if (iter.record[type] && iter.record[type].call) {
	    var decoder = iter.record[type];
	    vars.head.correctPacketLength = vars.head.numrec * decoder.expected;

	    function validate ( ) {
	      if (decoder && decoder.json) {
	        this.tap(decoder.json);
	      }
	    }
	    function save (V) {
	      if (V.record.system_time) {
	        list.push(V.record);
	        delete V.record;
	      } else {
	        // console.log("BAD", V.record);
	      }
	    }

	    function each (end, i) {
	      // console.log('each', i, vars, arguments);
	      // TODO: quick hack, revisit
	      if (list.length > vars.head.numrec) {
	        end( );
	        return;
	      }
	      this.into('record', function (rec) {
	        decoder.call(this, vars);
	        if (rec.system_time) {
	          validate.call(this);
	        } else {
	          end( );
	          return;
	        }
	      }).tap(save);
	      ;

	    }
	    
	    function payload ( ) {
	      var data = raw.slice(0);
	      vars.head.extra = new Buffer('');
	      if (vars.head.correctPacketLength && vars.head.correctPacketLength <= data.length) {
	        vars.head.extra = data.slice(vars.head.correctPacketLength);
	        data = data.slice(0, vars.head.correctPacketLength);
	      }
	      vars.head.expected = (data.length) / decoder.expected;
	      vars.head.recSize = data.length / (vars.head.numrec)
	      var bs = binary.parse(data);
	      return bs;
	    }

	    function decode ( ) {
	      var parsed = payload( ).loop(each).vars;
	      return list;
	    }
	    return decode;
	  }
	}

	iter.record = {4: EGVRecord };
	iter.register = function register (Type) {
	  iter.record[Type.type] = Type;
	}

	function EGVRecord (head) {
	  return this
	    .word32le('system_time')
	    .word32le('display_time')
	    .word16le('full_glucose')
	    .word8('full_trend')
	    .word16le('crc')
	    ;
	}
	EGVRecord.expected = 13;
	function fill (name, ch) {
	  this.loop(function (end, vars) {
	    this.word8(name)
	      .tap(function (V) {
	        if (V[name] != ch) {
	          end( );
	        }
	      })
	      ;
	  });
	}

	function SensorData (head) {
	  return this
	    .word32le('system_time')
	    .word32le('display_time')
	    .word32le('unfiltered')
	    .word32le('filtered')
	    .word16le('rssi')
	    .word16le('crc')
	    .tap(function (rec) {
	      rec.system = ReceiverTime(rec.system_time);
	      rec.display = ReceiverTime(rec.display_time);
	    })
	    ;
	}
	SensorData.type = 3;
	SensorData.expected = 20;

	function describe_page (op, Type) {
	  Type.type = op;
	  iter.register(Type);
	}
	function XMLPage (head) {
	  return this
	    .word32le('system_time')
	    .word32le('display_time')
	    .scan('xml', new Buffer([ 0x00, 0x00]))
	    // .word32le('null')
	    .scan('extra', new Buffer([ 0xff, 0xff ]))
	    .tap(function (rec) {
	      rec.xml = rec.xml.toString( );
	      rec.system = ReceiverTime(rec.system_time);
	      rec.display = ReceiverTime(rec.display_time);
	    }).vars;
	}
	describe_page(0, function ManufacturingData ( ) {
	  XMLPage.apply(this, arguments);
	});

	describe_page(1, function FirmwareParameterData ( ) {
	  XMLPage.apply(this, arguments);
	});

	describe_page(2, function PCParameterData ( ) {
	  XMLPage.apply(this, arguments);
	});

	describe_page(3, SensorData);
	function ReceiverTime (ts) {
	  var base = Date.parse('2009-01-01T00:00:00-0800');
	  return new Date(base + (ts * 1000));
	}

	EGVRecord.type = 4;

	describe_page(5, function CalSet ( ) {
	});

	describe_page(6, function Deviations ( ) {
	});

	describe_page(7, function Insertions ( ) {
	});

	describe_page(8, function ReceiverLog ( ) {
	});

	describe_page(9, function ReceiverErrror ( ) {
	});

	describe_page(10, function Meter ( ) {
	});

	describe_page(11, function UserEvent ( ) {
	});

	describe_page(12, function UserSettings ( ) {
	});

	EGVRecord.consts = {
	  VALUE_MASK: 1023
	, DISPLAY_ONLY_MASK: 32768
	, TREND_ARROW_MASK: 15
	, NOISE_MASK: 0x70
	};
	EGVRecord.json = function (rec) {
	  rec.glucose = rec.full_glucose & EGVRecord.consts.VALUE_MASK;
	  rec.display_only = rec.full_glucose & EGVRecord.consts.DISPLAY_ONLY_MASK;
	  rec.trend_arrow = rec.full_trend & EGVRecord.consts.TREND_ARROW_MASK;
	  rec.noise = (rec.full_trend & EGVRecord.consts.NOISE_MASK) >> 4;
	  rec.system = ReceiverTime(rec.system_time);
	  rec.display = ReceiverTime(rec.display_time);
	}

	function EventRecord (head) {
	  return this
	    .word32le('system_time')
	    .word32le('display_time')
	    .word8('event_type')
	    .word8('event_subtype')
	    .word32le('display_time')
	    .word32le('event_value')
	    .word16le('crc')
	    ;
	}

	function install_page (Page) {
	  var name = 'read' + Page.name;
	  this[name] = function readKnownPage (page, cb) {
	    this.ReadPage({type: Page.type, page: page}, cb);
	  };

	  var pager = name + 'PageRange';
	  this[pager] = function readKnownPageRange (cb) {
	    this.ReadDatabasePageRange({type: Page.type}, cb);
	  };

	  /*
	  this['create' + Page.name + 'Stream'] = function readKnownStream (start, stop) {
	    var cur = stop;
	    this.stream(function (stream) {
	      console.log('creating stream');
	      this.loop(function (end) {
	        console.log("EACH PAGE", cur, start, stop, arguments);
	        console.log('ASKING FOR PAGE', cur);
	        this.readEGVPage(cur, function onPage (err, page) {
	          console.log('got page writing', err, page.json.length, 'entries');
	          page.json.forEach(function (el) { stream.write(el) });
	          cur--;
	          if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
	        })
	        ;
	      });
	    });
	    return stream;
	  };
	  */

	}


	function packets (message, saw) {
	  var thunk = this;
	  suite.forEach(function each (packet) {
	    message.install.call(thunk, packet, saw);
	  });
	  this.getSensorPageRange = function (cb) {
	    this.ReadDatabasePageRange({type: 3}, cb);
	  }
	  this.getEGVPageRange = function (cb) {
	    this.ReadDatabasePageRange({type: 4}, cb);
	  }
	  this.getReceiverLogPageRange = function (cb) {
	    this.ReadDatabasePageRange({type: 8}, cb);
	  }

	  this.readEGVPage = function (page, cb) {
	    this.ReadPage({type: 4, page: page}, cb);
	  }

	  this.ManufacturingData = function (page, cb) {
	    this.ReadPage({type: 0, page: page}, cb);
	  }
	  
	  var cur;
	  for (var x in iter.record) {
	    cur = iter.record[x];
	    install_page.call(this, cur);
	  }

	}
	packets.iter = iter;
	packets.suite = suite;
	module.exports = packets;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var Chainsaw = __webpack_require__(8);
	var EventEmitter = __webpack_require__(6).EventEmitter;
	var Buffers = __webpack_require__(19);
	var Vars = __webpack_require__(15);
	var Stream = __webpack_require__(17).Stream;

	exports = module.exports = function (bufOrEm, eventName) {
	    if (Buffer.isBuffer(bufOrEm)) {
	        return exports.parse(bufOrEm);
	    }
	    
	    var s = exports.stream();
	    if (bufOrEm && bufOrEm.pipe) {
	        bufOrEm.pipe(s);
	    }
	    else if (bufOrEm) {
	        bufOrEm.on(eventName || 'data', function (buf) {
	            s.write(buf);
	        });
	        
	        bufOrEm.on('end', function () {
	            s.end();
	        });
	    }
	    return s;
	};

	exports.stream = function (input) {
	    if (input) return exports.apply(null, arguments);
	    
	    var pending = null;
	    function getBytes (bytes, cb, skip) {
	        pending = {
	            bytes : bytes,
	            skip : skip,
	            cb : function (buf) {
	                pending = null;
	                cb(buf);
	            },
	        };
	        dispatch();
	    }
	    
	    var offset = null;
	    function dispatch () {
	        if (!pending) {
	            if (caughtEnd) done = true;
	            return;
	        }
	        if (typeof pending === 'function') {
	            pending();
	        }
	        else {
	            var bytes = offset + pending.bytes;
	            
	            if (buffers.length >= bytes) {
	                var buf;
	                if (offset == null) {
	                    buf = buffers.splice(0, bytes);
	                    if (!pending.skip) {
	                        buf = buf.slice();
	                    }
	                }
	                else {
	                    if (!pending.skip) {
	                        buf = buffers.slice(offset, bytes);
	                    }
	                    offset = bytes;
	                }
	                
	                if (pending.skip) {
	                    pending.cb();
	                }
	                else {
	                    pending.cb(buf);
	                }
	            }
	        }
	    }
	    
	    function builder (saw) {
	        function next () { if (!done) saw.next() }
	        
	        var self = words(function (bytes, cb) {
	            return function (name) {
	                getBytes(bytes, function (buf) {
	                    vars.set(name, cb(buf));
	                    next();
	                });
	            };
	        });
	        
	        self.tap = function (cb) {
	            saw.nest(cb, vars.store);
	        };
	        
	        self.into = function (key, cb) {
	            if (!vars.get(key)) vars.set(key, {});
	            var parent = vars;
	            vars = Vars(parent.get(key));
	            
	            saw.nest(function () {
	                cb.apply(this, arguments);
	                this.tap(function () {
	                    vars = parent;
	                });
	            }, vars.store);
	        };
	        
	        self.flush = function () {
	            vars.store = {};
	            next();
	        };
	        
	        self.loop = function (cb) {
	            var end = false;
	            
	            saw.nest(false, function loop () {
	                this.vars = vars.store;
	                cb.call(this, function () {
	                    end = true;
	                    next();
	                }, vars.store);
	                this.tap(function () {
	                    if (end) saw.next()
	                    else loop.call(this)
	                }.bind(this));
	            }, vars.store);
	        };
	        
	        self.buffer = function (name, bytes) {
	            if (typeof bytes === 'string') {
	                bytes = vars.get(bytes);
	            }
	            
	            getBytes(bytes, function (buf) {
	                vars.set(name, buf);
	                next();
	            });
	        };
	        
	        self.skip = function (bytes) {
	            if (typeof bytes === 'string') {
	                bytes = vars.get(bytes);
	            }
	            
	            getBytes(bytes, function () {
	                next();
	            });
	        };
	        
	        self.scan = function find (name, search) {
	            if (typeof search === 'string') {
	                search = new Buffer(search);
	            }
	            else if (!Buffer.isBuffer(search)) {
	                throw new Error('search must be a Buffer or a string');
	            }
	            
	            var taken = 0;
	            pending = function () {
	                var pos = buffers.indexOf(search, offset + taken);
	                var i = pos-offset-taken;
	                if (pos !== -1) {
	                    pending = null;
	                    if (offset != null) {
	                        vars.set(
	                            name,
	                            buffers.slice(offset, offset + taken + i)
	                        );
	                        offset += taken + i + search.length;
	                    }
	                    else {
	                        vars.set(
	                            name,
	                            buffers.slice(0, taken + i)
	                        );
	                        buffers.splice(0, taken + i + search.length);
	                    }
	                    next();
	                    dispatch();
	                } else {
	                    i = Math.max(buffers.length - search.length - offset - taken, 0);
					}
	                taken += i;
	            };
	            dispatch();
	        };
	        
	        self.peek = function (cb) {
	            offset = 0;
	            saw.nest(function () {
	                cb.call(this, vars.store);
	                this.tap(function () {
	                    offset = null;
	                });
	            });
	        };
	        
	        return self;
	    };
	    
	    var stream = Chainsaw.light(builder);
	    stream.writable = true;
	    
	    var buffers = Buffers();
	    
	    stream.write = function (buf) {
	        buffers.push(buf);
	        dispatch();
	    };
	    
	    var vars = Vars();
	    
	    var done = false, caughtEnd = false;
	    stream.end = function () {
	        caughtEnd = true;
	    };
	    
	    stream.pipe = Stream.prototype.pipe;
	    Object.getOwnPropertyNames(EventEmitter.prototype).forEach(function (name) {
	        stream[name] = EventEmitter.prototype[name];
	    });
	    
	    return stream;
	};

	exports.parse = function parse (buffer) {
	    var self = words(function (bytes, cb) {
	        return function (name) {
	            if (offset + bytes <= buffer.length) {
	                var buf = buffer.slice(offset, offset + bytes);
	                offset += bytes;
	                vars.set(name, cb(buf));
	            }
	            else {
	                vars.set(name, null);
	            }
	            return self;
	        };
	    });
	    
	    var offset = 0;
	    var vars = Vars();
	    self.vars = vars.store;
	    
	    self.tap = function (cb) {
	        cb.call(self, vars.store);
	        return self;
	    };
	    
	    self.into = function (key, cb) {
	        if (!vars.get(key)) {
	            vars.set(key, {});
	        }
	        var parent = vars;
	        vars = Vars(parent.get(key));
	        cb.call(self, vars.store);
	        vars = parent;
	        return self;
	    };
	    
	    self.loop = function (cb) {
	        var end = false;
	        var ender = function () { end = true };
	        while (end === false) {
	            cb.call(self, ender, vars.store);
	        }
	        return self;
	    };
	    
	    self.buffer = function (name, size) {
	        if (typeof size === 'string') {
	            size = vars.get(size);
	        }
	        var buf = buffer.slice(offset, Math.min(buffer.length, offset + size));
	        offset += size;
	        vars.set(name, buf);
	        
	        return self;
	    };
	    
	    self.skip = function (bytes) {
	        if (typeof bytes === 'string') {
	            bytes = vars.get(bytes);
	        }
	        offset += bytes;
	        
	        return self;
	    };
	    
	    self.scan = function (name, search) {
	        if (typeof search === 'string') {
	            search = new Buffer(search);
	        }
	        else if (!Buffer.isBuffer(search)) {
	            throw new Error('search must be a Buffer or a string');
	        }
	        vars.set(name, null);
	        
	        // simple but slow string search
	        for (var i = 0; i + offset <= buffer.length - search.length + 1; i++) {
	            for (
	                var j = 0;
	                j < search.length && buffer[offset+i+j] === search[j];
	                j++
	            );
	            if (j === search.length) break;
	        }
	        
	        vars.set(name, buffer.slice(offset, offset + i));
	        offset += i + search.length;
	        return self;
	    };
	    
	    self.peek = function (cb) {
	        var was = offset;
	        cb.call(self, vars.store);
	        offset = was;
	        return self;
	    };
	    
	    self.flush = function () {
	        vars.store = {};
	        return self;
	    };
	    
	    self.eof = function () {
	        return offset >= buffer.length;
	    };
	    
	    return self;
	};

	// convert byte strings to unsigned little endian numbers
	function decodeLEu (bytes) {
	    var acc = 0;
	    for (var i = 0; i < bytes.length; i++) {
	        acc += Math.pow(256,i) * bytes[i];
	    }
	    return acc;
	}

	// convert byte strings to unsigned big endian numbers
	function decodeBEu (bytes) {
	    var acc = 0;
	    for (var i = 0; i < bytes.length; i++) {
	        acc += Math.pow(256, bytes.length - i - 1) * bytes[i];
	    }
	    return acc;
	}

	// convert byte strings to signed big endian numbers
	function decodeBEs (bytes) {
	    var val = decodeBEu(bytes);
	    if ((bytes[0] & 0x80) == 0x80) {
	        val -= Math.pow(256, bytes.length);
	    }
	    return val;
	}

	// convert byte strings to signed little endian numbers
	function decodeLEs (bytes) {
	    var val = decodeLEu(bytes);
	    if ((bytes[bytes.length - 1] & 0x80) == 0x80) {
	        val -= Math.pow(256, bytes.length);
	    }
	    return val;
	}

	function words (decode) {
	    var self = {};
	    
	    [ 1, 2, 4, 8 ].forEach(function (bytes) {
	        var bits = bytes * 8;
	        
	        self['word' + bits + 'le']
	        = self['word' + bits + 'lu']
	        = decode(bytes, decodeLEu);
	        
	        self['word' + bits + 'ls']
	        = decode(bytes, decodeLEs);
	        
	        self['word' + bits + 'be']
	        = self['word' + bits + 'bu']
	        = decode(bytes, decodeBEu);
	        
	        self['word' + bits + 'bs']
	        = decode(bytes, decodeBEs);
	    });
	    
	    // word8be(n) == word8le(n) for all n
	    self.word8 = self.word8u = self.word8be;
	    self.word8s = self.word8bs;
	    
	    return self;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {var Traverse = __webpack_require__(18);
	var EventEmitter = __webpack_require__(6).EventEmitter;

	module.exports = Chainsaw;
	function Chainsaw (builder) {
	    var saw = Chainsaw.saw(builder, {});
	    var r = builder.call(saw.handlers, saw);
	    if (r !== undefined) saw.handlers = r;
	    saw.record();
	    return saw.chain();
	};

	Chainsaw.light = function ChainsawLight (builder) {
	    var saw = Chainsaw.saw(builder, {});
	    var r = builder.call(saw.handlers, saw);
	    if (r !== undefined) saw.handlers = r;
	    return saw.chain();
	};

	Chainsaw.saw = function (builder, handlers) {
	    var saw = new EventEmitter;
	    saw.handlers = handlers;
	    saw.actions = [];

	    saw.chain = function () {
	        var ch = Traverse(saw.handlers).map(function (node) {
	            if (this.isRoot) return node;
	            var ps = this.path;

	            if (typeof node === 'function') {
	                this.update(function () {
	                    saw.actions.push({
	                        path : ps,
	                        args : [].slice.call(arguments)
	                    });
	                    return ch;
	                });
	            }
	        });

	        process.nextTick(function () {
	            saw.emit('begin');
	            saw.next();
	        });

	        return ch;
	    };

	    saw.pop = function () {
	        return saw.actions.shift();
	    };

	    saw.next = function () {
	        var action = saw.pop();

	        if (!action) {
	            saw.emit('end');
	        }
	        else if (!action.trap) {
	            var node = saw.handlers;
	            action.path.forEach(function (key) { node = node[key] });
	            node.apply(saw.handlers, action.args);
	        }
	    };

	    saw.nest = function (cb) {
	        var args = [].slice.call(arguments, 1);
	        var autonext = true;

	        if (typeof cb === 'boolean') {
	            var autonext = cb;
	            cb = args.shift();
	        }

	        var s = Chainsaw.saw(builder, {});
	        var r = builder.call(s.handlers, s);

	        if (r !== undefined) s.handlers = r;

	        // If we are recording...
	        if ("undefined" !== typeof saw.step) {
	            // ... our children should, too
	            s.record();
	        }

	        cb.apply(s.chain(), args);
	        if (autonext !== false) s.on('end', saw.next);
	    };

	    saw.record = function () {
	        upgradeChainsaw(saw);
	    };

	    ['trap', 'down', 'jump'].forEach(function (method) {
	        saw[method] = function () {
	            throw new Error("To use the trap, down and jump features, please "+
	                            "call record() first to start recording actions.");
	        };
	    });

	    return saw;
	};

	function upgradeChainsaw(saw) {
	    saw.step = 0;

	    // override pop
	    saw.pop = function () {
	        return saw.actions[saw.step++];
	    };

	    saw.trap = function (name, cb) {
	        var ps = Array.isArray(name) ? name : [name];
	        saw.actions.push({
	            path : ps,
	            step : saw.step,
	            cb : cb,
	            trap : true
	        });
	    };

	    saw.down = function (name) {
	        var ps = (Array.isArray(name) ? name : [name]).join('/');
	        var i = saw.actions.slice(saw.step).map(function (x) {
	            if (x.trap && x.step <= saw.step) return false;
	            return x.path.join('/') == ps;
	        }).indexOf(true);

	        if (i >= 0) saw.step += i;
	        else saw.step = saw.actions.length;

	        var act = saw.actions[saw.step - 1];
	        if (act && act.trap) {
	            // It's a trap!
	            saw.step = act.step;
	            act.cb();
	        }
	        else saw.next();
	    };

	    saw.jump = function (step) {
	        saw.step = step;
	        saw.next();
	    };
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	

	var consts = {
	  SYNC: 0x01
	};
	module.exports = consts;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process, Buffer) {//filter will reemit the data if cb(err,pass) pass is truthy

	// reduce is more tricky
	// maybe we want to group the reductions or emit progress updates occasionally
	// the most basic reduce just emits one 'data' event after it has recieved 'end'

	var Stream = __webpack_require__(17).Stream
	  , es = exports
	  , through = __webpack_require__(20)
	  , from = __webpack_require__(21)
	  , duplex = __webpack_require__(22)
	  , map = __webpack_require__(23)
	  , pause = __webpack_require__(24)
	  , split = __webpack_require__(25)
	  , pipeline = __webpack_require__(26)
	  , immediately = global.setImmediate || process.nextTick;

	es.Stream = Stream //re-export Stream from core
	es.through = through
	es.from = from
	es.duplex = duplex
	es.map = map
	es.pause = pause
	es.split = split
	es.pipeline = es.connect = es.pipe = pipeline
	// merge / concat
	//
	// combine multiple streams into a single stream.
	// will emit end only once

	es.concat = //actually this should be called concat
	es.merge = function (/*streams...*/) {
	  var toMerge = [].slice.call(arguments)
	  var stream = new Stream()
	  stream.setMaxListeners(0) // allow adding more than 11 streams
	  var endCount = 0
	  stream.writable = stream.readable = true

	  toMerge.forEach(function (e) {
	    e.pipe(stream, {end: false})
	    var ended = false
	    e.on('end', function () {
	      if(ended) return
	      ended = true
	      endCount ++
	      if(endCount == toMerge.length)
	        stream.emit('end') 
	    })
	  })
	  stream.write = function (data) {
	    this.emit('data', data)
	  }
	  stream.destroy = function () {
	    toMerge.forEach(function (e) {
	      if(e.destroy) e.destroy()
	    })
	  }
	  return stream
	}


	// writable stream, collects all events into an array 
	// and calls back when 'end' occurs
	// mainly I'm using this to test the other functions

	es.writeArray = function (done) {
	  if ('function' !== typeof done)
	    throw new Error('function writeArray (done): done must be function')

	  var a = new Stream ()
	    , array = [], isDone = false
	  a.write = function (l) {
	    array.push(l)
	  }
	  a.end = function () {
	    isDone = true
	    done(null, array)
	  }
	  a.writable = true
	  a.readable = false
	  a.destroy = function () {
	    a.writable = a.readable = false
	    if(isDone) return
	    done(new Error('destroyed before end'), array)
	  }
	  return a
	}

	//return a Stream that reads the properties of an object
	//respecting pause() and resume()

	es.readArray = function (array) {
	  var stream = new Stream()
	    , i = 0
	    , paused = false
	    , ended = false
	 
	  stream.readable = true  
	  stream.writable = false
	 
	  if(!Array.isArray(array))
	    throw new Error('event-stream.read expects an array')
	  
	  stream.resume = function () {
	    if(ended) return
	    paused = false
	    var l = array.length
	    while(i < l && !paused && !ended) {
	      stream.emit('data', array[i++])
	    }
	    if(i == l && !ended)
	      ended = true, stream.readable = false, stream.emit('end')
	  }
	  process.nextTick(stream.resume)
	  stream.pause = function () {
	     paused = true
	  }
	  stream.destroy = function () {
	    ended = true
	    stream.emit('close')
	  }
	  return stream
	}

	//
	// readable (asyncFunction)
	// return a stream that calls an async function while the stream is not paused.
	//
	// the function must take: (count, callback) {...
	//

	es.readable =
	function (func, continueOnError) {
	  var stream = new Stream()
	    , i = 0
	    , paused = false
	    , ended = false
	    , reading = false

	  stream.readable = true  
	  stream.writable = false
	 
	  if('function' !== typeof func)
	    throw new Error('event-stream.readable expects async function')
	  
	  stream.on('end', function () { ended = true })
	  
	  function get (err, data) {
	    
	    if(err) {
	      stream.emit('error', err)
	      if(!continueOnError) stream.emit('end')
	    } else if (arguments.length > 1)
	      stream.emit('data', data)

	    immediately(function () {
	      if(ended || paused || reading) return
	      try {
	        reading = true
	        func.call(stream, i++, function () {
	          reading = false
	          get.apply(null, arguments)
	        })
	      } catch (err) {
	        stream.emit('error', err)    
	      }
	    })
	  }
	  stream.resume = function () {
	    paused = false
	    get()
	  }
	  process.nextTick(get)
	  stream.pause = function () {
	     paused = true
	  }
	  stream.destroy = function () {
	    stream.emit('end')
	    stream.emit('close')
	    ended = true
	  }
	  return stream
	}


	//
	// map sync
	//

	es.mapSync = function (sync) { 
	  return es.through(function write(data) {
	    var mappedData = sync(data)
	    if (typeof mappedData !== 'undefined')
	      this.emit('data', mappedData)
	  })
	}

	//
	// log just print out what is coming through the stream, for debugging
	//

	es.log = function (name) {
	  return es.through(function (data) {
	    var args = [].slice.call(arguments)
	    if(name) console.error(name, data)
	    else     console.error(data)
	    this.emit('data', data)
	  })
	}


	//
	// child -- pipe through a child process
	//

	es.child = function (child) {

	  return es.duplex(child.stdin, child.stdout)

	}

	//
	// parse
	//
	// must be used after es.split() to ensure that each chunk represents a line
	// source.pipe(es.split()).pipe(es.parse())

	es.parse = function () { 
	  return es.through(function (data) {
	    var obj
	    try {
	      if(data) //ignore empty lines
	        obj = JSON.parse(data.toString())
	    } catch (err) {
	      return console.error(err, 'attemping to parse:', data)
	    }
	    //ignore lines that where only whitespace.
	    if(obj !== undefined)
	      this.emit('data', obj)
	  })
	}
	//
	// stringify
	//

	es.stringify = function () { 
	  var Buffer = __webpack_require__(13).Buffer
	  return es.mapSync(function (e){ 
	    return JSON.stringify(Buffer.isBuffer(e) ? e.toString() : e) + '\n'
	  }) 
	}

	//
	// replace a string within a stream.
	//
	// warn: just concatenates the string and then does str.split().join(). 
	// probably not optimal.
	// for smallish responses, who cares?
	// I need this for shadow-npm so it's only relatively small json files.

	es.replace = function (from, to) {
	  return es.pipeline(es.split(from), es.join(to))
	} 

	//
	// join chunks with a joiner. just like Array#join
	// also accepts a callback that is passed the chunks appended together
	// this is still supported for legacy reasons.
	// 

	es.join = function (str) {
	  
	  //legacy api
	  if('function' === typeof str)
	    return es.wait(str)

	  var first = true
	  return es.through(function (data) {
	    if(!first)
	      this.emit('data', str)
	    first = false
	    this.emit('data', data)
	    return true
	  })
	}


	//
	// wait. callback when 'end' is emitted, with all chunks appended as string.
	//

	es.wait = function (callback) {
	  var arr = []
	  return es.through(function (data) { arr.push(data) },
	    function () {
	      var body = Buffer.isBuffer(arr[0]) ? Buffer.concat(arr)
	        : arr.join('')
	      this.emit('data', body)
	      this.emit('end')
	      if(callback) callback(null, body)
	    })
	}

	es.pipeable = function () {
	  throw new Error('[EVENT-STREAM] es.pipeable is deprecated')
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(16), __webpack_require__(13).Buffer))

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	

	function ReadDatabasePartitions (vars) {
	  return vars.data.toString( );
	}
	ReadDatabasePartitions.op = 15;

	module.exports = ReadDatabasePartitions;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = Put;
	function Put () {
	    if (!(this instanceof Put)) return new Put;
	    
	    var words = [];
	    var len = 0;
	    
	    this.put = function (buf) {
	        words.push({ buffer : buf });
	        len += buf.length;
	        return this;
	    };
	    
	    this.word8 = function (x) {
	        words.push({ bytes : 1, value : x });
	        len += 1;
	        return this;
	    };
	    
	    this.floatle = function (x) {
	        words.push({ bytes : 'float', endian : 'little', value : x });
	        len += 4;
	        return this;
	    };
	    
	    [ 8, 16, 24, 32, 64 ].forEach((function (bits) {
	        this['word' + bits + 'be'] = function (x) {
	            words.push({ endian : 'big', bytes : bits / 8, value : x });
	            len += bits / 8;
	            return this;
	        };
	        
	        this['word' + bits + 'le'] = function (x) {
	            words.push({ endian : 'little', bytes : bits / 8, value : x });
	            len += bits / 8;
	            return this;
	        };
	    }).bind(this));
	    
	    this.pad = function (bytes) {
	        words.push({ endian : 'big', bytes : bytes, value : 0 });
	        len += bytes;
	        return this;
	    };
	    
	    this.length = function () {
	        return len;
	    };
	    
	    this.buffer = function () {
	        var buf = new Buffer(len);
	        var offset = 0;
	        words.forEach(function (word) {
	            if (word.buffer) {
	                word.buffer.copy(buf, offset, 0);
	                offset += word.buffer.length;
	            }
	            else if (word.bytes == 'float') {
	                // s * f * 2^e
	                var v = Math.abs(word.value);
	                var s = (word.value >= 0) * 1;
	                var e = Math.ceil(Math.log(v) / Math.LN2);
	                var f = v / (1 << e);
	                console.dir([s,e,f]);
	                
	                console.log(word.value);
	                
	                // s:1, e:7, f:23
	                // [seeeeeee][efffffff][ffffffff][ffffffff]
	                buf[offset++] = (s << 7) & ~~(e / 2);
	                buf[offset++] = ((e & 1) << 7) & ~~(f / (1 << 16));
	                buf[offset++] = 0;
	                buf[offset++] = 0;
	                offset += 4;
	            }
	            else {
	                var big = word.endian === 'big';
	                var ix = big ? [ (word.bytes - 1) * 8, -8 ] : [ 0, 8 ];
	                
	                for (
	                    var i = ix[0];
	                    big ? i >= 0 : i < word.bytes * 8;
	                    i += ix[1]
	                ) {
	                    if (i >= 32) {
	                        buf[offset++] = Math.floor(word.value / Math.pow(2, i)) & 0xff;
	                    }
	                    else {
	                        buf[offset++] = (word.value >> i) & 0xff;
	                    }
	                }
	            }
	        });
	        return buf;
	    };
	    
	    this.write = function (stream) {
	        stream.write(this.buffer());
	    };
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var base64 = __webpack_require__(38)
	var ieee754 = __webpack_require__(35)
	var isArray = __webpack_require__(36)

	exports.Buffer = Buffer
	exports.SlowBuffer = Buffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var kMaxLength = 0x3fffffff

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Note:
	 *
	 * - Implementation must support adding new properties to `Uint8Array` instances.
	 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
	 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *    incorrect length in some situations.
	 *
	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
	 * get the Object implementation, which is slower but will work correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = (function () {
	  try {
	    var buf = new ArrayBuffer(0)
	    var arr = new Uint8Array(buf)
	    arr.foo = function () { return 42 }
	    return 42 === arr.foo() && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	})()

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (subject, encoding, noZero) {
	  if (!(this instanceof Buffer))
	    return new Buffer(subject, encoding, noZero)

	  var type = typeof subject

	  // Find the length
	  var length
	  if (type === 'number')
	    length = subject > 0 ? subject >>> 0 : 0
	  else if (type === 'string') {
	    if (encoding === 'base64')
	      subject = base64clean(subject)
	    length = Buffer.byteLength(subject, encoding)
	  } else if (type === 'object' && subject !== null) { // assume object is array-like
	    if (subject.type === 'Buffer' && isArray(subject.data))
	      subject = subject.data
	    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
	  } else
	    throw new TypeError('must start with number, buffer, array or string')

	  if (this.length > kMaxLength)
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	      'size: 0x' + kMaxLength.toString(16) + ' bytes')

	  var buf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Preferred: Return an augmented `Uint8Array` instance for best performance
	    buf = Buffer._augment(new Uint8Array(length))
	  } else {
	    // Fallback: Return THIS instance of Buffer (created by `new`)
	    buf = this
	    buf.length = length
	    buf._isBuffer = true
	  }

	  var i
	  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
	    // Speed optimization -- use set if we're copying from a typed array
	    buf._set(subject)
	  } else if (isArrayish(subject)) {
	    // Treat array-ish objects as a byte array
	    if (Buffer.isBuffer(subject)) {
	      for (i = 0; i < length; i++)
	        buf[i] = subject.readUInt8(i)
	    } else {
	      for (i = 0; i < length; i++)
	        buf[i] = ((subject[i] % 256) + 256) % 256
	    }
	  } else if (type === 'string') {
	    buf.write(subject, 0, encoding)
	  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
	    for (i = 0; i < length; i++) {
	      buf[i] = 0
	    }
	  }

	  return buf
	}

	Buffer.isBuffer = function (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
	    throw new TypeError('Arguments must be Buffers')

	  var x = a.length
	  var y = b.length
	  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }
	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function (list, totalLength) {
	  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

	  if (list.length === 0) {
	    return new Buffer(0)
	  } else if (list.length === 1) {
	    return list[0]
	  }

	  var i
	  if (totalLength === undefined) {
	    totalLength = 0
	    for (i = 0; i < list.length; i++) {
	      totalLength += list[i].length
	    }
	  }

	  var buf = new Buffer(totalLength)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	Buffer.byteLength = function (str, encoding) {
	  var ret
	  str = str + ''
	  switch (encoding || 'utf8') {
	    case 'ascii':
	    case 'binary':
	    case 'raw':
	      ret = str.length
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = str.length * 2
	      break
	    case 'hex':
	      ret = str.length >>> 1
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8ToBytes(str).length
	      break
	    case 'base64':
	      ret = base64ToBytes(str).length
	      break
	    default:
	      ret = str.length
	  }
	  return ret
	}

	// pre-set for values that may exist in the future
	Buffer.prototype.length = undefined
	Buffer.prototype.parent = undefined

	// toString(encoding, start=0, end=buffer.length)
	Buffer.prototype.toString = function (encoding, start, end) {
	  var loweredCase = false

	  start = start >>> 0
	  end = end === undefined || end === Infinity ? this.length : end >>> 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase)
	          throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.equals = function (b) {
	  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max)
	      str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b)
	}

	// `get` will be removed in Node 0.13+
	Buffer.prototype.get = function (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` will be removed in Node 0.13+
	Buffer.prototype.set = function (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var byte = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(byte)) throw new Error('Invalid hex string')
	    buf[offset + i] = byte
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function asciiWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function utf16leWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
	  return charsWritten
	}

	Buffer.prototype.write = function (string, offset, length, encoding) {
	  // Support both (string, offset, length, encoding)
	  // and the legacy (string, encoding, offset, length)
	  if (isFinite(offset)) {
	    if (!isFinite(length)) {
	      encoding = length
	      length = undefined
	    }
	  } else {  // legacy
	    var swap = encoding
	    encoding = offset
	    offset = length
	    length = swap
	  }

	  offset = Number(offset) || 0
	  var remaining = this.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }
	  encoding = String(encoding || 'utf8').toLowerCase()

	  var ret
	  switch (encoding) {
	    case 'hex':
	      ret = hexWrite(this, string, offset, length)
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8Write(this, string, offset, length)
	      break
	    case 'ascii':
	      ret = asciiWrite(this, string, offset, length)
	      break
	    case 'binary':
	      ret = binaryWrite(this, string, offset, length)
	      break
	    case 'base64':
	      ret = base64Write(this, string, offset, length)
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = utf16leWrite(this, string, offset, length)
	      break
	    default:
	      throw new TypeError('Unknown encoding: ' + encoding)
	  }
	  return ret
	}

	Buffer.prototype.toJSON = function () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  var res = ''
	  var tmp = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    if (buf[i] <= 0x7F) {
	      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
	      tmp = ''
	    } else {
	      tmp += '%' + buf[i].toString(16)
	    }
	  }

	  return res + decodeUtf8Char(tmp)
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  return asciiSlice(buf, start, end)
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len;
	    if (start < 0)
	      start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0)
	      end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start)
	    end = start

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    return Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    var newBuf = new Buffer(sliceLen, undefined, true)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	    return newBuf
	  }
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0)
	    throw new RangeError('offset is not uint')
	  if (offset + ext > length)
	    throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	      ((this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      this[offset + 3])
	}

	Buffer.prototype.readInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80))
	    return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16) |
	      (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	      (this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = value
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = value
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = value
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function (target, target_start, start, end) {
	  var source = this

	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (!target_start) target_start = 0

	  // Copy 0 bytes; we're done
	  if (end === start) return
	  if (target.length === 0 || source.length === 0) return

	  // Fatal error conditions
	  if (end < start) throw new TypeError('sourceEnd < sourceStart')
	  if (target_start < 0 || target_start >= target.length)
	    throw new TypeError('targetStart out of bounds')
	  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
	  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length)
	    end = this.length
	  if (target.length - target_start < end - start)
	    end = target.length - target_start + start

	  var len = end - start

	  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < len; i++) {
	      target[i + target_start] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), target_start)
	  }
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new TypeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array get/set methods before overwriting
	  arr._get = arr.get
	  arr._set = arr.set

	  // deprecated, will be removed in node 0.13+
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function isArrayish (subject) {
	  return isArray(subject) || Buffer.isBuffer(subject) ||
	      subject && typeof subject === 'object' &&
	      typeof subject.length === 'number'
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    var b = str.charCodeAt(i)
	    if (b <= 0x7F) {
	      byteArray.push(b)
	    } else {
	      var start = i
	      if (b >= 0xD800 && b <= 0xDFFF) i++
	      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
	      for (var j = 0; j < h.length; j++) {
	        byteArray.push(parseInt(h[j], 16))
	      }
	    }
	  }
	  return byteArray
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(str)
	}

	function blitBuffer (src, dst, offset, length, unitSize) {
	  if (unitSize) length -= length % unitSize;
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length))
	      break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function decodeUtf8Char (str) {
	  try {
	    return decodeURIComponent(str)
	  } catch (err) {
	    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	module.exports = {
	  crc1: __webpack_require__(27),
	  crc8: __webpack_require__(28),
	  crc81wire: __webpack_require__(29),
	  crc16: __webpack_require__(30),
	  crc16ccitt: __webpack_require__(31),
	  crc16modbus: __webpack_require__(32),
	  crc24: __webpack_require__(33),
	  crc32: __webpack_require__(34)
	};


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function (store) {
	    function getset (name, value) {
	        var node = vars.store;
	        var keys = name.split('.');
	        keys.slice(0,-1).forEach(function (k) {
	            if (node[k] === undefined) node[k] = {};
	            node = node[k]
	        });
	        var key = keys[keys.length - 1];
	        if (arguments.length == 1) {
	            return node[key];
	        }
	        else {
	            return node[key] = value;
	        }
	    }
	    
	    var vars = {
	        get : function (name) {
	            return getset(name);
	        },
	        set : function (name, value) {
	            return getset(name, value);
	        },
	        store : store || {},
	    };
	    return vars;
	};


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canMutationObserver = typeof window !== 'undefined'
	    && window.MutationObserver;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    var queue = [];

	    if (canMutationObserver) {
	        var hiddenDiv = document.createElement("div");
	        var observer = new MutationObserver(function () {
	            var queueList = queue.slice();
	            queue.length = 0;
	            queueList.forEach(function (fn) {
	                fn();
	            });
	        });

	        observer.observe(hiddenDiv, { attributes: true });

	        return function nextTick(fn) {
	            if (!queue.length) {
	                hiddenDiv.setAttribute('yes', 'no');
	            }
	            queue.push(fn);
	        };
	    }

	    if (canPost) {
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(6).EventEmitter;
	var inherits = __webpack_require__(45);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(39);
	Stream.Writable = __webpack_require__(40);
	Stream.Duplex = __webpack_require__(41);
	Stream.Transform = __webpack_require__(42);
	Stream.PassThrough = __webpack_require__(43);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Traverse;
	function Traverse (obj) {
	    if (!(this instanceof Traverse)) return new Traverse(obj);
	    this.value = obj;
	}

	Traverse.prototype.get = function (ps) {
	    var node = this.value;
	    for (var i = 0; i < ps.length; i ++) {
	        var key = ps[i];
	        if (!Object.hasOwnProperty.call(node, key)) {
	            node = undefined;
	            break;
	        }
	        node = node[key];
	    }
	    return node;
	};

	Traverse.prototype.set = function (ps, value) {
	    var node = this.value;
	    for (var i = 0; i < ps.length - 1; i ++) {
	        var key = ps[i];
	        if (!Object.hasOwnProperty.call(node, key)) node[key] = {};
	        node = node[key];
	    }
	    node[ps[i]] = value;
	    return value;
	};

	Traverse.prototype.map = function (cb) {
	    return walk(this.value, cb, true);
	};

	Traverse.prototype.forEach = function (cb) {
	    this.value = walk(this.value, cb, false);
	    return this.value;
	};

	Traverse.prototype.reduce = function (cb, init) {
	    var skip = arguments.length === 1;
	    var acc = skip ? this.value : init;
	    this.forEach(function (x) {
	        if (!this.isRoot || !skip) {
	            acc = cb.call(this, acc, x);
	        }
	    });
	    return acc;
	};

	Traverse.prototype.deepEqual = function (obj) {
	    if (arguments.length !== 1) {
	        throw new Error(
	            'deepEqual requires exactly one object to compare against'
	        );
	    }
	    
	    var equal = true;
	    var node = obj;
	    
	    this.forEach(function (y) {
	        var notEqual = (function () {
	            equal = false;
	            //this.stop();
	            return undefined;
	        }).bind(this);
	        
	        //if (node === undefined || node === null) return notEqual();
	        
	        if (!this.isRoot) {
	        /*
	            if (!Object.hasOwnProperty.call(node, this.key)) {
	                return notEqual();
	            }
	        */
	            if (typeof node !== 'object') return notEqual();
	            node = node[this.key];
	        }
	        
	        var x = node;
	        
	        this.post(function () {
	            node = x;
	        });
	        
	        var toS = function (o) {
	            return Object.prototype.toString.call(o);
	        };
	        
	        if (this.circular) {
	            if (Traverse(obj).get(this.circular.path) !== x) notEqual();
	        }
	        else if (typeof x !== typeof y) {
	            notEqual();
	        }
	        else if (x === null || y === null || x === undefined || y === undefined) {
	            if (x !== y) notEqual();
	        }
	        else if (x.__proto__ !== y.__proto__) {
	            notEqual();
	        }
	        else if (x === y) {
	            // nop
	        }
	        else if (typeof x === 'function') {
	            if (x instanceof RegExp) {
	                // both regexps on account of the __proto__ check
	                if (x.toString() != y.toString()) notEqual();
	            }
	            else if (x !== y) notEqual();
	        }
	        else if (typeof x === 'object') {
	            if (toS(y) === '[object Arguments]'
	            || toS(x) === '[object Arguments]') {
	                if (toS(x) !== toS(y)) {
	                    notEqual();
	                }
	            }
	            else if (x instanceof Date || y instanceof Date) {
	                if (!(x instanceof Date) || !(y instanceof Date)
	                || x.getTime() !== y.getTime()) {
	                    notEqual();
	                }
	            }
	            else {
	                var kx = Object.keys(x);
	                var ky = Object.keys(y);
	                if (kx.length !== ky.length) return notEqual();
	                for (var i = 0; i < kx.length; i++) {
	                    var k = kx[i];
	                    if (!Object.hasOwnProperty.call(y, k)) {
	                        notEqual();
	                    }
	                }
	            }
	        }
	    });
	    
	    return equal;
	};

	Traverse.prototype.paths = function () {
	    var acc = [];
	    this.forEach(function (x) {
	        acc.push(this.path); 
	    });
	    return acc;
	};

	Traverse.prototype.nodes = function () {
	    var acc = [];
	    this.forEach(function (x) {
	        acc.push(this.node);
	    });
	    return acc;
	};

	Traverse.prototype.clone = function () {
	    var parents = [], nodes = [];
	    
	    return (function clone (src) {
	        for (var i = 0; i < parents.length; i++) {
	            if (parents[i] === src) {
	                return nodes[i];
	            }
	        }
	        
	        if (typeof src === 'object' && src !== null) {
	            var dst = copy(src);
	            
	            parents.push(src);
	            nodes.push(dst);
	            
	            Object.keys(src).forEach(function (key) {
	                dst[key] = clone(src[key]);
	            });
	            
	            parents.pop();
	            nodes.pop();
	            return dst;
	        }
	        else {
	            return src;
	        }
	    })(this.value);
	};

	function walk (root, cb, immutable) {
	    var path = [];
	    var parents = [];
	    var alive = true;
	    
	    return (function walker (node_) {
	        var node = immutable ? copy(node_) : node_;
	        var modifiers = {};
	        
	        var state = {
	            node : node,
	            node_ : node_,
	            path : [].concat(path),
	            parent : parents.slice(-1)[0],
	            key : path.slice(-1)[0],
	            isRoot : path.length === 0,
	            level : path.length,
	            circular : null,
	            update : function (x) {
	                if (!state.isRoot) {
	                    state.parent.node[state.key] = x;
	                }
	                state.node = x;
	            },
	            'delete' : function () {
	                delete state.parent.node[state.key];
	            },
	            remove : function () {
	                if (Array.isArray(state.parent.node)) {
	                    state.parent.node.splice(state.key, 1);
	                }
	                else {
	                    delete state.parent.node[state.key];
	                }
	            },
	            before : function (f) { modifiers.before = f },
	            after : function (f) { modifiers.after = f },
	            pre : function (f) { modifiers.pre = f },
	            post : function (f) { modifiers.post = f },
	            stop : function () { alive = false }
	        };
	        
	        if (!alive) return state;
	        
	        if (typeof node === 'object' && node !== null) {
	            state.isLeaf = Object.keys(node).length == 0;
	            
	            for (var i = 0; i < parents.length; i++) {
	                if (parents[i].node_ === node_) {
	                    state.circular = parents[i];
	                    break;
	                }
	            }
	        }
	        else {
	            state.isLeaf = true;
	        }
	        
	        state.notLeaf = !state.isLeaf;
	        state.notRoot = !state.isRoot;
	        
	        // use return values to update if defined
	        var ret = cb.call(state, state.node);
	        if (ret !== undefined && state.update) state.update(ret);
	        if (modifiers.before) modifiers.before.call(state, state.node);
	        
	        if (typeof state.node == 'object'
	        && state.node !== null && !state.circular) {
	            parents.push(state);
	            
	            var keys = Object.keys(state.node);
	            keys.forEach(function (key, i) {
	                path.push(key);
	                
	                if (modifiers.pre) modifiers.pre.call(state, state.node[key], key);
	                
	                var child = walker(state.node[key]);
	                if (immutable && Object.hasOwnProperty.call(state.node, key)) {
	                    state.node[key] = child.node;
	                }
	                
	                child.isLast = i == keys.length - 1;
	                child.isFirst = i == 0;
	                
	                if (modifiers.post) modifiers.post.call(state, child);
	                
	                path.pop();
	            });
	            parents.pop();
	        }
	        
	        if (modifiers.after) modifiers.after.call(state, state.node);
	        
	        return state;
	    })(root).node;
	}

	Object.keys(Traverse.prototype).forEach(function (key) {
	    Traverse[key] = function (obj) {
	        var args = [].slice.call(arguments, 1);
	        var t = Traverse(obj);
	        return t[key].apply(t, args);
	    };
	});

	function copy (src) {
	    if (typeof src === 'object' && src !== null) {
	        var dst;
	        
	        if (Array.isArray(src)) {
	            dst = [];
	        }
	        else if (src instanceof Date) {
	            dst = new Date(src);
	        }
	        else if (src instanceof Boolean) {
	            dst = new Boolean(src);
	        }
	        else if (src instanceof Number) {
	            dst = new Number(src);
	        }
	        else if (src instanceof String) {
	            dst = new String(src);
	        }
	        else {
	            dst = Object.create(Object.getPrototypeOf(src));
	        }
	        
	        Object.keys(src).forEach(function (key) {
	            dst[key] = src[key];
	        });
	        return dst;
	    }
	    else return src;
	}


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = Buffers;

	function Buffers (bufs) {
	    if (!(this instanceof Buffers)) return new Buffers(bufs);
	    this.buffers = bufs || [];
	    this.length = this.buffers.reduce(function (size, buf) {
	        return size + buf.length
	    }, 0);
	}

	Buffers.prototype.push = function () {
	    for (var i = 0; i < arguments.length; i++) {
	        if (!Buffer.isBuffer(arguments[i])) {
	            throw new TypeError('Tried to push a non-buffer');
	        }
	    }
	    
	    for (var i = 0; i < arguments.length; i++) {
	        var buf = arguments[i];
	        this.buffers.push(buf);
	        this.length += buf.length;
	    }
	    return this.length;
	};

	Buffers.prototype.unshift = function () {
	    for (var i = 0; i < arguments.length; i++) {
	        if (!Buffer.isBuffer(arguments[i])) {
	            throw new TypeError('Tried to unshift a non-buffer');
	        }
	    }
	    
	    for (var i = 0; i < arguments.length; i++) {
	        var buf = arguments[i];
	        this.buffers.unshift(buf);
	        this.length += buf.length;
	    }
	    return this.length;
	};

	Buffers.prototype.copy = function (dst, dStart, start, end) {
	    return this.slice(start, end).copy(dst, dStart, 0, end - start);
	};

	Buffers.prototype.splice = function (i, howMany) {
	    var buffers = this.buffers;
	    var index = i >= 0 ? i : this.length - i;
	    var reps = [].slice.call(arguments, 2);
	    
	    if (howMany === undefined) {
	        howMany = this.length - index;
	    }
	    else if (howMany > this.length - index) {
	        howMany = this.length - index;
	    }
	    
	    for (var i = 0; i < reps.length; i++) {
	        this.length += reps[i].length;
	    }
	    
	    var removed = new Buffers();
	    var bytes = 0;
	    
	    var startBytes = 0;
	    for (
	        var ii = 0;
	        ii < buffers.length && startBytes + buffers[ii].length < index;
	        ii ++
	    ) { startBytes += buffers[ii].length }
	    
	    if (index - startBytes > 0) {
	        var start = index - startBytes;
	        
	        if (start + howMany < buffers[ii].length) {
	            removed.push(buffers[ii].slice(start, start + howMany));
	            
	            var orig = buffers[ii];
	            //var buf = new Buffer(orig.length - howMany);
	            var buf0 = new Buffer(start);
	            for (var i = 0; i < start; i++) {
	                buf0[i] = orig[i];
	            }
	            
	            var buf1 = new Buffer(orig.length - start - howMany);
	            for (var i = start + howMany; i < orig.length; i++) {
	                buf1[ i - howMany - start ] = orig[i]
	            }
	            
	            if (reps.length > 0) {
	                var reps_ = reps.slice();
	                reps_.unshift(buf0);
	                reps_.push(buf1);
	                buffers.splice.apply(buffers, [ ii, 1 ].concat(reps_));
	                ii += reps_.length;
	                reps = [];
	            }
	            else {
	                buffers.splice(ii, 1, buf0, buf1);
	                //buffers[ii] = buf;
	                ii += 2;
	            }
	        }
	        else {
	            removed.push(buffers[ii].slice(start));
	            buffers[ii] = buffers[ii].slice(0, start);
	            ii ++;
	        }
	    }
	    
	    if (reps.length > 0) {
	        buffers.splice.apply(buffers, [ ii, 0 ].concat(reps));
	        ii += reps.length;
	    }
	    
	    while (removed.length < howMany) {
	        var buf = buffers[ii];
	        var len = buf.length;
	        var take = Math.min(len, howMany - removed.length);
	        
	        if (take === len) {
	            removed.push(buf);
	            buffers.splice(ii, 1);
	        }
	        else {
	            removed.push(buf.slice(0, take));
	            buffers[ii] = buffers[ii].slice(take);
	        }
	    }
	    
	    this.length -= removed.length;
	    
	    return removed;
	};
	 
	Buffers.prototype.slice = function (i, j) {
	    var buffers = this.buffers;
	    if (j === undefined) j = this.length;
	    if (i === undefined) i = 0;
	    
	    if (j > this.length) j = this.length;
	    
	    var startBytes = 0;
	    for (
	        var si = 0;
	        si < buffers.length && startBytes + buffers[si].length <= i;
	        si ++
	    ) { startBytes += buffers[si].length }
	    
	    var target = new Buffer(j - i);
	    
	    var ti = 0;
	    for (var ii = si; ti < j - i && ii < buffers.length; ii++) {
	        var len = buffers[ii].length;
	        
	        var start = ti === 0 ? i - startBytes : 0;
	        var end = ti + len >= j - i
	            ? Math.min(start + (j - i) - ti, len)
	            : len
	        ;
	        
	        buffers[ii].copy(target, ti, start, end);
	        ti += end - start;
	    }
	    
	    return target;
	};

	Buffers.prototype.pos = function (i) {
	    if (i < 0 || i >= this.length) throw new Error('oob');
	    var l = i, bi = 0, bu = null;
	    for (;;) {
	        bu = this.buffers[bi];
	        if (l < bu.length) {
	            return {buf: bi, offset: l};
	        } else {
	            l -= bu.length;
	        }
	        bi++;
	    }
	};

	Buffers.prototype.get = function get (i) {
	    var pos = this.pos(i);

	    return this.buffers[pos.buf].get(pos.offset);
	};

	Buffers.prototype.set = function set (i, b) {
	    var pos = this.pos(i);

	    return this.buffers[pos.buf].set(pos.offset, b);
	};

	Buffers.prototype.indexOf = function (needle, offset) {
	    if ("string" === typeof needle) {
	        needle = new Buffer(needle);
	    } else if (needle instanceof Buffer) {
	        // already a buffer
	    } else {
	        throw new Error('Invalid type for a search string');
	    }

	    if (!needle.length) {
	        return 0;
	    }

	    if (!this.length) {
	        return -1;
	    }

	    var i = 0, j = 0, match = 0, mstart, pos = 0;

	    // start search from a particular point in the virtual buffer
	    if (offset) {
	        var p = this.pos(offset);
	        i = p.buf;
	        j = p.offset;
	        pos = offset;
	    }

	    // for each character in virtual buffer
	    for (;;) {
	        while (j >= this.buffers[i].length) {
	            j = 0;
	            i++;

	            if (i >= this.buffers.length) {
	                // search string not found
	                return -1;
	            }
	        }

	        var char = this.buffers[i][j];

	        if (char == needle[match]) {
	            // keep track where match started
	            if (match == 0) {
	                mstart = {
	                    i: i,
	                    j: j,
	                    pos: pos
	                };
	            }
	            match++;
	            if (match == needle.length) {
	                // full match
	                return mstart.pos;
	            }
	        } else if (match != 0) {
	            // a partial match ended, go back to match starting position
	            // this will continue the search at the next character
	            i = mstart.i;
	            j = mstart.j;
	            pos = mstart.pos;
	            match = 0;
	        }

	        j++;
	        pos++;
	    }
	};

	Buffers.prototype.toBuffer = function() {
	    return this.slice();
	}

	Buffers.prototype.toString = function(encoding, start, end) {
	    return this.slice(start, end).toString(encoding);
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {var Stream = __webpack_require__(17)

	// through
	//
	// a stream that does nothing but re-emit the input.
	// useful for aggregating a series of changing but not ending streams into one stream)

	exports = module.exports = through
	through.through = through

	//create a readable writable stream.

	function through (write, end, opts) {
	  write = write || function (data) { this.queue(data) }
	  end = end || function () { this.queue(null) }

	  var ended = false, destroyed = false, buffer = [], _ended = false
	  var stream = new Stream()
	  stream.readable = stream.writable = true
	  stream.paused = false

	//  stream.autoPause   = !(opts && opts.autoPause   === false)
	  stream.autoDestroy = !(opts && opts.autoDestroy === false)

	  stream.write = function (data) {
	    write.call(this, data)
	    return !stream.paused
	  }

	  function drain() {
	    while(buffer.length && !stream.paused) {
	      var data = buffer.shift()
	      if(null === data)
	        return stream.emit('end')
	      else
	        stream.emit('data', data)
	    }
	  }

	  stream.queue = stream.push = function (data) {
	//    console.error(ended)
	    if(_ended) return stream
	    if(data == null) _ended = true
	    buffer.push(data)
	    drain()
	    return stream
	  }

	  //this will be registered as the first 'end' listener
	  //must call destroy next tick, to make sure we're after any
	  //stream piped from here.
	  //this is only a problem if end is not emitted synchronously.
	  //a nicer way to do this is to make sure this is the last listener for 'end'

	  stream.on('end', function () {
	    stream.readable = false
	    if(!stream.writable && stream.autoDestroy)
	      process.nextTick(function () {
	        stream.destroy()
	      })
	  })

	  function _end () {
	    stream.writable = false
	    end.call(stream)
	    if(!stream.readable && stream.autoDestroy)
	      stream.destroy()
	  }

	  stream.end = function (data) {
	    if(ended) return
	    ended = true
	    if(arguments.length) stream.write(data)
	    _end() // will emit or queue
	    return stream
	  }

	  stream.destroy = function () {
	    if(destroyed) return
	    destroyed = true
	    ended = true
	    buffer.length = 0
	    stream.writable = stream.readable = false
	    stream.emit('close')
	    return stream
	  }

	  stream.pause = function () {
	    if(stream.paused) return
	    stream.paused = true
	    return stream
	  }

	  stream.resume = function () {
	    if(stream.paused) {
	      stream.paused = false
	      stream.emit('resume')
	    }
	    drain()
	    //may have become paused again,
	    //as drain emits 'data'.
	    if(!stream.paused)
	      stream.emit('drain')
	    return stream
	  }
	  return stream
	}

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {
	'use strict';

	var Stream = __webpack_require__(17)

	// from
	//
	// a stream that reads from an source.
	// source may be an array, or a function.
	// from handles pause behaviour for you.

	module.exports =
	function from (source) {
	  if(Array.isArray(source)) {
	    source = source.slice()
	    return from (function (i) {
	      if(source.length)
	        this.emit('data', source.shift())
	      else
	        this.emit('end')
	      return true
	    })
	  }
	  var s = new Stream(), i = 0
	  s.ended = false
	  s.started = false
	  s.readable = true
	  s.writable = false
	  s.paused = false
	  s.ended = false
	  s.pause = function () {
	    s.started = true
	    s.paused = true
	  }
	  function next () {
	    s.started = true
	    if(s.ended) return
	    while(!s.ended && !s.paused && source.call(s, i++, function () {
	      if(!s.ended && !s.paused)
	          next()
	    }))
	      ;
	  }
	  s.resume = function () {
	    s.started = true
	    s.paused = false
	    next()
	  }
	  s.on('end', function () {
	    s.ended = true
	    s.readable = false
	    process.nextTick(s.destroy)
	  })
	  s.destroy = function () {
	    s.ended = true
	    s.emit('close') 
	  }
	  /*
	    by default, the stream will start emitting at nextTick
	    if you want, you can pause it, after pipeing.
	    you can also resume before next tick, and that will also
	    work.
	  */
	  process.nextTick(function () {
	    if(!s.started) s.resume()
	  })
	  return s
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	var Stream = __webpack_require__(17)
	var writeMethods = ["write", "end", "destroy"]
	var readMethods = ["resume", "pause"]
	var readEvents = ["data", "close"]
	var slice = Array.prototype.slice

	module.exports = duplex

	function forEach (arr, fn) {
	    if (arr.forEach) {
	        return arr.forEach(fn)
	    }

	    for (var i = 0; i < arr.length; i++) {
	        fn(arr[i], i)
	    }
	}

	function duplex(writer, reader) {
	    var stream = new Stream()
	    var ended = false

	    forEach(writeMethods, proxyWriter)

	    forEach(readMethods, proxyReader)

	    forEach(readEvents, proxyStream)

	    reader.on("end", handleEnd)

	    writer.on("drain", function() {
	      stream.emit("drain")
	    })

	    writer.on("error", reemit)
	    reader.on("error", reemit)

	    stream.writable = writer.writable
	    stream.readable = reader.readable

	    return stream

	    function proxyWriter(methodName) {
	        stream[methodName] = method

	        function method() {
	            return writer[methodName].apply(writer, arguments)
	        }
	    }

	    function proxyReader(methodName) {
	        stream[methodName] = method

	        function method() {
	            stream.emit(methodName)
	            var func = reader[methodName]
	            if (func) {
	                return func.apply(reader, arguments)
	            }
	            reader.emit(methodName)
	        }
	    }

	    function proxyStream(methodName) {
	        reader.on(methodName, reemit)

	        function reemit() {
	            var args = slice.call(arguments)
	            args.unshift(methodName)
	            stream.emit.apply(stream, args)
	        }
	    }

	    function handleEnd() {
	        if (ended) {
	            return
	        }
	        ended = true
	        var args = slice.call(arguments)
	        args.unshift("end")
	        stream.emit.apply(stream, args)
	    }

	    function reemit(err) {
	        stream.emit("error", err)
	    }
	}


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {//filter will reemit the data if cb(err,pass) pass is truthy

	// reduce is more tricky
	// maybe we want to group the reductions or emit progress updates occasionally
	// the most basic reduce just emits one 'data' event after it has recieved 'end'


	var Stream = __webpack_require__(17).Stream


	//create an event stream and apply function to each .write
	//emitting each response as data
	//unless it's an empty callback

	module.exports = function (mapper, opts) {

	  var stream = new Stream()
	    , self = this
	    , inputs = 0
	    , outputs = 0
	    , ended = false
	    , paused = false
	    , destroyed = false
	    , lastWritten = 0
	    , inNext = false

	  this.opts = opts || {};
	  var errorEventName = this.opts.failures ? 'failure' : 'error';

	  // Items that are not ready to be written yet (because they would come out of
	  // order) get stuck in a queue for later.
	  var writeQueue = {}

	  stream.writable = true
	  stream.readable = true

	  function queueData (data, number) {
	    var nextToWrite = lastWritten + 1

	    if (number === nextToWrite) {
	      // If it's next, and its not undefined write it
	      if (data !== undefined) {
	        stream.emit.apply(stream, ['data', data])
	      }
	      lastWritten ++
	      nextToWrite ++
	    } else {
	      // Otherwise queue it for later.
	      writeQueue[number] = data
	    }

	    // If the next value is in the queue, write it
	    if (writeQueue.hasOwnProperty(nextToWrite)) {
	      var dataToWrite = writeQueue[nextToWrite]
	      delete writeQueue[nextToWrite]
	      return queueData(dataToWrite, nextToWrite)
	    }

	    outputs ++
	    if(inputs === outputs) {
	      if(paused) paused = false, stream.emit('drain') //written all the incoming events
	      if(ended) end()
	    }
	  }

	  function next (err, data, number) {
	    if(destroyed) return
	    inNext = true

	    if (!err || self.opts.failures) {
	      queueData(data, number)
	    }

	    if (err) {
	      stream.emit.apply(stream, [ errorEventName, err ]);
	    }

	    inNext = false;
	  }

	  // Wrap the mapper function by calling its callback with the order number of
	  // the item in the stream.
	  function wrappedMapper (input, number, callback) {
	    return mapper.call(null, input, function(err, data){
	      callback(err, data, number)
	    })
	  }

	  stream.write = function (data) {
	    if(ended) throw new Error('map stream is not writable')
	    inNext = false
	    inputs ++

	    try {
	      //catch sync errors and handle them like async errors
	      var written = wrappedMapper(data, inputs, next)
	      paused = (written === false)
	      return !paused
	    } catch (err) {
	      //if the callback has been called syncronously, and the error
	      //has occured in an listener, throw it again.
	      if(inNext)
	        throw err
	      next(err)
	      return !paused
	    }
	  }

	  function end (data) {
	    //if end was called with args, write it, 
	    ended = true //write will emit 'end' if ended is true
	    stream.writable = false
	    if(data !== undefined) {
	      return queueData(data, inputs)
	    } else if (inputs == outputs) { //wait for processing 
	      stream.readable = false, stream.emit('end'), stream.destroy() 
	    }
	  }

	  stream.end = function (data) {
	    if(ended) return
	    end()
	  }

	  stream.destroy = function () {
	    ended = destroyed = true
	    stream.writable = stream.readable = paused = false
	    process.nextTick(function () {
	      stream.emit('close')
	    })
	  }
	  stream.pause = function () {
	    paused = true
	  }

	  stream.resume = function () {
	    paused = false
	  }

	  return stream
	}




	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	//through@2 handles this by default!
	module.exports = __webpack_require__(20)



/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	//filter will reemit the data if cb(err,pass) pass is truthy

	// reduce is more tricky
	// maybe we want to group the reductions or emit progress updates occasionally
	// the most basic reduce just emits one 'data' event after it has recieved 'end'


	var through = __webpack_require__(20)
	var Decoder = __webpack_require__(44).StringDecoder

	module.exports = split

	//TODO pass in a function to map across the lines.

	function split (matcher, mapper) {
	  var decoder = new Decoder()
	  var soFar = ''
	  if('function' === typeof matcher)
	    mapper = matcher, matcher = null
	  if (!matcher)
	    matcher = /\r?\n/

	  function emit(stream, piece) {
	    if(mapper) {
	      try {
	        piece = mapper(piece)
	      }
	      catch (err) {
	        return stream.emit('error', err)
	      }
	      if('undefined' !== typeof piece)
	        stream.queue(piece)
	    }
	    else
	      stream.queue(piece)
	  }

	  function next (stream, buffer) { 
	    var pieces = (soFar + buffer).split(matcher)
	    soFar = pieces.pop()

	    for (var i = 0; i < pieces.length; i++) {
	      var piece = pieces[i]
	      emit(stream, piece)
	    }
	  }

	  return through(function (b) {
	    next(this, decoder.write(b))
	  },
	  function () {
	    if(decoder.end) 
	      next(this, decoder.end())
	    if(soFar != null)
	      emit(this, soFar)
	    this.queue(null)
	  })
	}



/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var duplexer = __webpack_require__(22)

	module.exports = function () {

	  var streams = [].slice.call(arguments)
	    , first = streams[0]
	    , last = streams[streams.length - 1]
	    , thepipe = duplexer(first, last)

	  if(streams.length == 1)
	    return streams[0]
	  else if (!streams.length)
	    throw new Error('connect called with empty args')

	  //pipe all the streams together

	  function recurse (streams) {
	    if(streams.length < 2)
	      return
	    streams[0].pipe(streams[1])
	    recurse(streams.slice(1))  
	  }
	  
	  recurse(streams)
	 
	  function onerror () {
	    var args = [].slice.call(arguments)
	    args.unshift('error')
	    thepipe.emit.apply(thepipe, args)
	  }
	  
	  //es.duplex already reemits the error from the first and last stream.
	  //add a listener for the inner streams in the pipeline.
	  for(var i = 1; i < streams.length - 1; i ++)
	    streams[i].on('error', onerror)

	  return thepipe
	}



/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	module.exports = create('crc1', function(buf, previous) {
	  var accum, byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = ~~previous;
	  accum = 0;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    accum += byte;
	  }
	  crc += accum % 256;
	  return crc % 256;
	});


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b, 0x12, 0x15, 0x38, 0x3f, 0x36, 0x31, 0x24, 0x23, 0x2a, 0x2d, 0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65, 0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d, 0xe0, 0xe7, 0xee, 0xe9, 0xfc, 0xfb, 0xf2, 0xf5, 0xd8, 0xdf, 0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd, 0x90, 0x97, 0x9e, 0x99, 0x8c, 0x8b, 0x82, 0x85, 0xa8, 0xaf, 0xa6, 0xa1, 0xb4, 0xb3, 0xba, 0xbd, 0xc7, 0xc0, 0xc9, 0xce, 0xdb, 0xdc, 0xd5, 0xd2, 0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4, 0xed, 0xea, 0xb7, 0xb0, 0xb9, 0xbe, 0xab, 0xac, 0xa5, 0xa2, 0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a, 0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 0x1f, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0d, 0x0a, 0x57, 0x50, 0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42, 0x6f, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7d, 0x7a, 0x89, 0x8e, 0x87, 0x80, 0x95, 0x92, 0x9b, 0x9c, 0xb1, 0xb6, 0xbf, 0xb8, 0xad, 0xaa, 0xa3, 0xa4, 0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2, 0xeb, 0xec, 0xc1, 0xc6, 0xcf, 0xc8, 0xdd, 0xda, 0xd3, 0xd4, 0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c, 0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44, 0x19, 0x1e, 0x17, 0x10, 0x05, 0x02, 0x0b, 0x0c, 0x21, 0x26, 0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34, 0x4e, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5c, 0x5b, 0x76, 0x71, 0x78, 0x7f, 0x6a, 0x6d, 0x64, 0x63, 0x3e, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2c, 0x2b, 0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d, 0x14, 0x13, 0xae, 0xa9, 0xa0, 0xa7, 0xb2, 0xb5, 0xbc, 0xbb, 0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83, 0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 0xe6, 0xe1, 0xe8, 0xef, 0xfa, 0xfd, 0xf4, 0xf3];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('crc-8', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = ~~previous;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = TABLE[(crc ^ byte) & 0xff] & 0xff;
	  }
	  return crc;
	});


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x00, 0x5e, 0xbc, 0xe2, 0x61, 0x3f, 0xdd, 0x83, 0xc2, 0x9c, 0x7e, 0x20, 0xa3, 0xfd, 0x1f, 0x41, 0x9d, 0xc3, 0x21, 0x7f, 0xfc, 0xa2, 0x40, 0x1e, 0x5f, 0x01, 0xe3, 0xbd, 0x3e, 0x60, 0x82, 0xdc, 0x23, 0x7d, 0x9f, 0xc1, 0x42, 0x1c, 0xfe, 0xa0, 0xe1, 0xbf, 0x5d, 0x03, 0x80, 0xde, 0x3c, 0x62, 0xbe, 0xe0, 0x02, 0x5c, 0xdf, 0x81, 0x63, 0x3d, 0x7c, 0x22, 0xc0, 0x9e, 0x1d, 0x43, 0xa1, 0xff, 0x46, 0x18, 0xfa, 0xa4, 0x27, 0x79, 0x9b, 0xc5, 0x84, 0xda, 0x38, 0x66, 0xe5, 0xbb, 0x59, 0x07, 0xdb, 0x85, 0x67, 0x39, 0xba, 0xe4, 0x06, 0x58, 0x19, 0x47, 0xa5, 0xfb, 0x78, 0x26, 0xc4, 0x9a, 0x65, 0x3b, 0xd9, 0x87, 0x04, 0x5a, 0xb8, 0xe6, 0xa7, 0xf9, 0x1b, 0x45, 0xc6, 0x98, 0x7a, 0x24, 0xf8, 0xa6, 0x44, 0x1a, 0x99, 0xc7, 0x25, 0x7b, 0x3a, 0x64, 0x86, 0xd8, 0x5b, 0x05, 0xe7, 0xb9, 0x8c, 0xd2, 0x30, 0x6e, 0xed, 0xb3, 0x51, 0x0f, 0x4e, 0x10, 0xf2, 0xac, 0x2f, 0x71, 0x93, 0xcd, 0x11, 0x4f, 0xad, 0xf3, 0x70, 0x2e, 0xcc, 0x92, 0xd3, 0x8d, 0x6f, 0x31, 0xb2, 0xec, 0x0e, 0x50, 0xaf, 0xf1, 0x13, 0x4d, 0xce, 0x90, 0x72, 0x2c, 0x6d, 0x33, 0xd1, 0x8f, 0x0c, 0x52, 0xb0, 0xee, 0x32, 0x6c, 0x8e, 0xd0, 0x53, 0x0d, 0xef, 0xb1, 0xf0, 0xae, 0x4c, 0x12, 0x91, 0xcf, 0x2d, 0x73, 0xca, 0x94, 0x76, 0x28, 0xab, 0xf5, 0x17, 0x49, 0x08, 0x56, 0xb4, 0xea, 0x69, 0x37, 0xd5, 0x8b, 0x57, 0x09, 0xeb, 0xb5, 0x36, 0x68, 0x8a, 0xd4, 0x95, 0xcb, 0x29, 0x77, 0xf4, 0xaa, 0x48, 0x16, 0xe9, 0xb7, 0x55, 0x0b, 0x88, 0xd6, 0x34, 0x6a, 0x2b, 0x75, 0x97, 0xc9, 0x4a, 0x14, 0xf6, 0xa8, 0x74, 0x2a, 0xc8, 0x96, 0x15, 0x4b, 0xa9, 0xf7, 0xb6, 0xe8, 0x0a, 0x54, 0xd7, 0x89, 0x6b, 0x35];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('dallas-1-wire', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = ~~previous;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = TABLE[(crc ^ byte) & 0xff] & 0xff;
	  }
	  return crc;
	});


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x0000, 0xc0c1, 0xc181, 0x0140, 0xc301, 0x03c0, 0x0280, 0xc241, 0xc601, 0x06c0, 0x0780, 0xc741, 0x0500, 0xc5c1, 0xc481, 0x0440, 0xcc01, 0x0cc0, 0x0d80, 0xcd41, 0x0f00, 0xcfc1, 0xce81, 0x0e40, 0x0a00, 0xcac1, 0xcb81, 0x0b40, 0xc901, 0x09c0, 0x0880, 0xc841, 0xd801, 0x18c0, 0x1980, 0xd941, 0x1b00, 0xdbc1, 0xda81, 0x1a40, 0x1e00, 0xdec1, 0xdf81, 0x1f40, 0xdd01, 0x1dc0, 0x1c80, 0xdc41, 0x1400, 0xd4c1, 0xd581, 0x1540, 0xd701, 0x17c0, 0x1680, 0xd641, 0xd201, 0x12c0, 0x1380, 0xd341, 0x1100, 0xd1c1, 0xd081, 0x1040, 0xf001, 0x30c0, 0x3180, 0xf141, 0x3300, 0xf3c1, 0xf281, 0x3240, 0x3600, 0xf6c1, 0xf781, 0x3740, 0xf501, 0x35c0, 0x3480, 0xf441, 0x3c00, 0xfcc1, 0xfd81, 0x3d40, 0xff01, 0x3fc0, 0x3e80, 0xfe41, 0xfa01, 0x3ac0, 0x3b80, 0xfb41, 0x3900, 0xf9c1, 0xf881, 0x3840, 0x2800, 0xe8c1, 0xe981, 0x2940, 0xeb01, 0x2bc0, 0x2a80, 0xea41, 0xee01, 0x2ec0, 0x2f80, 0xef41, 0x2d00, 0xedc1, 0xec81, 0x2c40, 0xe401, 0x24c0, 0x2580, 0xe541, 0x2700, 0xe7c1, 0xe681, 0x2640, 0x2200, 0xe2c1, 0xe381, 0x2340, 0xe101, 0x21c0, 0x2080, 0xe041, 0xa001, 0x60c0, 0x6180, 0xa141, 0x6300, 0xa3c1, 0xa281, 0x6240, 0x6600, 0xa6c1, 0xa781, 0x6740, 0xa501, 0x65c0, 0x6480, 0xa441, 0x6c00, 0xacc1, 0xad81, 0x6d40, 0xaf01, 0x6fc0, 0x6e80, 0xae41, 0xaa01, 0x6ac0, 0x6b80, 0xab41, 0x6900, 0xa9c1, 0xa881, 0x6840, 0x7800, 0xb8c1, 0xb981, 0x7940, 0xbb01, 0x7bc0, 0x7a80, 0xba41, 0xbe01, 0x7ec0, 0x7f80, 0xbf41, 0x7d00, 0xbdc1, 0xbc81, 0x7c40, 0xb401, 0x74c0, 0x7580, 0xb541, 0x7700, 0xb7c1, 0xb681, 0x7640, 0x7200, 0xb2c1, 0xb381, 0x7340, 0xb101, 0x71c0, 0x7080, 0xb041, 0x5000, 0x90c1, 0x9181, 0x5140, 0x9301, 0x53c0, 0x5280, 0x9241, 0x9601, 0x56c0, 0x5780, 0x9741, 0x5500, 0x95c1, 0x9481, 0x5440, 0x9c01, 0x5cc0, 0x5d80, 0x9d41, 0x5f00, 0x9fc1, 0x9e81, 0x5e40, 0x5a00, 0x9ac1, 0x9b81, 0x5b40, 0x9901, 0x59c0, 0x5880, 0x9841, 0x8801, 0x48c0, 0x4980, 0x8941, 0x4b00, 0x8bc1, 0x8a81, 0x4a40, 0x4e00, 0x8ec1, 0x8f81, 0x4f40, 0x8d01, 0x4dc0, 0x4c80, 0x8c41, 0x4400, 0x84c1, 0x8581, 0x4540, 0x8701, 0x47c0, 0x4680, 0x8641, 0x8201, 0x42c0, 0x4380, 0x8341, 0x4100, 0x81c1, 0x8081, 0x4040];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('crc-16', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = ~~previous;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = (TABLE[(crc ^ byte) & 0xff] ^ (crc >> 8)) & 0xffff;
	  }
	  return crc;
	});


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823, 0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067, 0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a, 0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('ccitt', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = previous != null ? ~~previous : 0xffff;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = (TABLE[((crc >> 8) ^ byte) & 0xff] ^ (crc << 8)) & 0xffff;
	  }
	  return crc;
	});


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x0000, 0xc0c1, 0xc181, 0x0140, 0xc301, 0x03c0, 0x0280, 0xc241, 0xc601, 0x06c0, 0x0780, 0xc741, 0x0500, 0xc5c1, 0xc481, 0x0440, 0xcc01, 0x0cc0, 0x0d80, 0xcd41, 0x0f00, 0xcfc1, 0xce81, 0x0e40, 0x0a00, 0xcac1, 0xcb81, 0x0b40, 0xc901, 0x09c0, 0x0880, 0xc841, 0xd801, 0x18c0, 0x1980, 0xd941, 0x1b00, 0xdbc1, 0xda81, 0x1a40, 0x1e00, 0xdec1, 0xdf81, 0x1f40, 0xdd01, 0x1dc0, 0x1c80, 0xdc41, 0x1400, 0xd4c1, 0xd581, 0x1540, 0xd701, 0x17c0, 0x1680, 0xd641, 0xd201, 0x12c0, 0x1380, 0xd341, 0x1100, 0xd1c1, 0xd081, 0x1040, 0xf001, 0x30c0, 0x3180, 0xf141, 0x3300, 0xf3c1, 0xf281, 0x3240, 0x3600, 0xf6c1, 0xf781, 0x3740, 0xf501, 0x35c0, 0x3480, 0xf441, 0x3c00, 0xfcc1, 0xfd81, 0x3d40, 0xff01, 0x3fc0, 0x3e80, 0xfe41, 0xfa01, 0x3ac0, 0x3b80, 0xfb41, 0x3900, 0xf9c1, 0xf881, 0x3840, 0x2800, 0xe8c1, 0xe981, 0x2940, 0xeb01, 0x2bc0, 0x2a80, 0xea41, 0xee01, 0x2ec0, 0x2f80, 0xef41, 0x2d00, 0xedc1, 0xec81, 0x2c40, 0xe401, 0x24c0, 0x2580, 0xe541, 0x2700, 0xe7c1, 0xe681, 0x2640, 0x2200, 0xe2c1, 0xe381, 0x2340, 0xe101, 0x21c0, 0x2080, 0xe041, 0xa001, 0x60c0, 0x6180, 0xa141, 0x6300, 0xa3c1, 0xa281, 0x6240, 0x6600, 0xa6c1, 0xa781, 0x6740, 0xa501, 0x65c0, 0x6480, 0xa441, 0x6c00, 0xacc1, 0xad81, 0x6d40, 0xaf01, 0x6fc0, 0x6e80, 0xae41, 0xaa01, 0x6ac0, 0x6b80, 0xab41, 0x6900, 0xa9c1, 0xa881, 0x6840, 0x7800, 0xb8c1, 0xb981, 0x7940, 0xbb01, 0x7bc0, 0x7a80, 0xba41, 0xbe01, 0x7ec0, 0x7f80, 0xbf41, 0x7d00, 0xbdc1, 0xbc81, 0x7c40, 0xb401, 0x74c0, 0x7580, 0xb541, 0x7700, 0xb7c1, 0xb681, 0x7640, 0x7200, 0xb2c1, 0xb381, 0x7340, 0xb101, 0x71c0, 0x7080, 0xb041, 0x5000, 0x90c1, 0x9181, 0x5140, 0x9301, 0x53c0, 0x5280, 0x9241, 0x9601, 0x56c0, 0x5780, 0x9741, 0x5500, 0x95c1, 0x9481, 0x5440, 0x9c01, 0x5cc0, 0x5d80, 0x9d41, 0x5f00, 0x9fc1, 0x9e81, 0x5e40, 0x5a00, 0x9ac1, 0x9b81, 0x5b40, 0x9901, 0x59c0, 0x5880, 0x9841, 0x8801, 0x48c0, 0x4980, 0x8941, 0x4b00, 0x8bc1, 0x8a81, 0x4a40, 0x4e00, 0x8ec1, 0x8f81, 0x4f40, 0x8d01, 0x4dc0, 0x4c80, 0x8c41, 0x4400, 0x84c1, 0x8581, 0x4540, 0x8701, 0x47c0, 0x4680, 0x8641, 0x8201, 0x42c0, 0x4380, 0x8341, 0x4100, 0x81c1, 0x8081, 0x4040];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('crc-16-modbus', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = previous != null ? ~~previous : 0xffff;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = (TABLE[(crc ^ byte) & 0xff] ^ (crc >> 8)) & 0xffff;
	  }
	  return crc;
	});


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x000000, 0x864cfb, 0x8ad50d, 0x0c99f6, 0x93e6e1, 0x15aa1a, 0x1933ec, 0x9f7f17, 0xa18139, 0x27cdc2, 0x2b5434, 0xad18cf, 0x3267d8, 0xb42b23, 0xb8b2d5, 0x3efe2e, 0xc54e89, 0x430272, 0x4f9b84, 0xc9d77f, 0x56a868, 0xd0e493, 0xdc7d65, 0x5a319e, 0x64cfb0, 0xe2834b, 0xee1abd, 0x685646, 0xf72951, 0x7165aa, 0x7dfc5c, 0xfbb0a7, 0x0cd1e9, 0x8a9d12, 0x8604e4, 0x00481f, 0x9f3708, 0x197bf3, 0x15e205, 0x93aefe, 0xad50d0, 0x2b1c2b, 0x2785dd, 0xa1c926, 0x3eb631, 0xb8faca, 0xb4633c, 0x322fc7, 0xc99f60, 0x4fd39b, 0x434a6d, 0xc50696, 0x5a7981, 0xdc357a, 0xd0ac8c, 0x56e077, 0x681e59, 0xee52a2, 0xe2cb54, 0x6487af, 0xfbf8b8, 0x7db443, 0x712db5, 0xf7614e, 0x19a3d2, 0x9fef29, 0x9376df, 0x153a24, 0x8a4533, 0x0c09c8, 0x00903e, 0x86dcc5, 0xb822eb, 0x3e6e10, 0x32f7e6, 0xb4bb1d, 0x2bc40a, 0xad88f1, 0xa11107, 0x275dfc, 0xdced5b, 0x5aa1a0, 0x563856, 0xd074ad, 0x4f0bba, 0xc94741, 0xc5deb7, 0x43924c, 0x7d6c62, 0xfb2099, 0xf7b96f, 0x71f594, 0xee8a83, 0x68c678, 0x645f8e, 0xe21375, 0x15723b, 0x933ec0, 0x9fa736, 0x19ebcd, 0x8694da, 0x00d821, 0x0c41d7, 0x8a0d2c, 0xb4f302, 0x32bff9, 0x3e260f, 0xb86af4, 0x2715e3, 0xa15918, 0xadc0ee, 0x2b8c15, 0xd03cb2, 0x567049, 0x5ae9bf, 0xdca544, 0x43da53, 0xc596a8, 0xc90f5e, 0x4f43a5, 0x71bd8b, 0xf7f170, 0xfb6886, 0x7d247d, 0xe25b6a, 0x641791, 0x688e67, 0xeec29c, 0x3347a4, 0xb50b5f, 0xb992a9, 0x3fde52, 0xa0a145, 0x26edbe, 0x2a7448, 0xac38b3, 0x92c69d, 0x148a66, 0x181390, 0x9e5f6b, 0x01207c, 0x876c87, 0x8bf571, 0x0db98a, 0xf6092d, 0x7045d6, 0x7cdc20, 0xfa90db, 0x65efcc, 0xe3a337, 0xef3ac1, 0x69763a, 0x578814, 0xd1c4ef, 0xdd5d19, 0x5b11e2, 0xc46ef5, 0x42220e, 0x4ebbf8, 0xc8f703, 0x3f964d, 0xb9dab6, 0xb54340, 0x330fbb, 0xac70ac, 0x2a3c57, 0x26a5a1, 0xa0e95a, 0x9e1774, 0x185b8f, 0x14c279, 0x928e82, 0x0df195, 0x8bbd6e, 0x872498, 0x016863, 0xfad8c4, 0x7c943f, 0x700dc9, 0xf64132, 0x693e25, 0xef72de, 0xe3eb28, 0x65a7d3, 0x5b59fd, 0xdd1506, 0xd18cf0, 0x57c00b, 0xc8bf1c, 0x4ef3e7, 0x426a11, 0xc426ea, 0x2ae476, 0xaca88d, 0xa0317b, 0x267d80, 0xb90297, 0x3f4e6c, 0x33d79a, 0xb59b61, 0x8b654f, 0x0d29b4, 0x01b042, 0x87fcb9, 0x1883ae, 0x9ecf55, 0x9256a3, 0x141a58, 0xefaaff, 0x69e604, 0x657ff2, 0xe33309, 0x7c4c1e, 0xfa00e5, 0xf69913, 0x70d5e8, 0x4e2bc6, 0xc8673d, 0xc4fecb, 0x42b230, 0xddcd27, 0x5b81dc, 0x57182a, 0xd154d1, 0x26359f, 0xa07964, 0xace092, 0x2aac69, 0xb5d37e, 0x339f85, 0x3f0673, 0xb94a88, 0x87b4a6, 0x01f85d, 0x0d61ab, 0x8b2d50, 0x145247, 0x921ebc, 0x9e874a, 0x18cbb1, 0xe37b16, 0x6537ed, 0x69ae1b, 0xefe2e0, 0x709df7, 0xf6d10c, 0xfa48fa, 0x7c0401, 0x42fa2f, 0xc4b6d4, 0xc82f22, 0x4e63d9, 0xd11cce, 0x575035, 0x5bc9c3, 0xdd8538];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('crc-24', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = previous != null ? ~~previous : 0xb704ce;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = (TABLE[((crc >> 16) ^ byte) & 0xff] ^ (crc << 8)) & 0xffffff;
	  }
	  return crc;
	});


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	var Buffer, TABLE, create;

	Buffer = __webpack_require__(13).Buffer;

	create = __webpack_require__(37);

	TABLE = [0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f, 0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9, 0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d];

	if (typeof Int32Array !== 'undefined') {
	  TABLE = new Int32Array(TABLE);
	}

	module.exports = create('crc-32', function(buf, previous) {
	  var byte, crc, _i, _len;
	  if (!Buffer.isBuffer(buf)) {
	    buf = Buffer(buf);
	  }
	  crc = previous === 0 ? 0 : ~~previous ^ -1;
	  for (_i = 0, _len = buf.length; _i < _len; _i++) {
	    byte = buf[_i];
	    crc = TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	  }
	  return crc ^ -1;
	});


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	exports.read = function(buffer, offset, isLE, mLen, nBytes) {
	  var e, m,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      nBits = -7,
	      i = isLE ? (nBytes - 1) : 0,
	      d = isLE ? -1 : 1,
	      s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity);
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	};

	exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
	      i = isLE ? 0 : (nBytes - 1),
	      d = isLE ? 1 : -1,
	      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

	  buffer[offset + i - d] |= s * 128;
	};


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * isArray
	 */

	var isArray = Array.isArray;

	/**
	 * toString
	 */

	var str = Object.prototype.toString;

	/**
	 * Whether or not the given `val`
	 * is an array.
	 *
	 * example:
	 *
	 *        isArray([]);
	 *        // > true
	 *        isArray(arguments);
	 *        // > false
	 *        isArray('');
	 *        // > false
	 *
	 * @param {mixed} val
	 * @return {bool}
	 */

	module.exports = isArray || function (val) {
	  return !! val && '[object Array]' == str.call(val);
	};


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.7.1
	module.exports = function(model, calc) {
	  var fn;
	  fn = function(buf, previous) {
	    return calc(buf, previous) >>> 0;
	  };
	  fn.signed = calc;
	  fn.unsigned = fn;
	  fn.model = model;
	  return fn;
	};


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS)
				return 62 // '+'
			if (code === SLASH)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}(false ? (this.base64js = {}) : exports))


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(46);
	exports.Stream = __webpack_require__(17);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(47);
	exports.Duplex = __webpack_require__(48);
	exports.Transform = __webpack_require__(49);
	exports.PassThrough = __webpack_require__(50);


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(47)


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(48)


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(49)


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(50)


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(13).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(52);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(13).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(6).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(17);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(53);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(51);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(48);

	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(44).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(48);

	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (util.isString(chunk) && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (util.isNullOrUndefined(chunk)) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      if (!addToFront)
	        state.reading = false;

	      // if we want the data now, just emit it.
	      if (state.flowing && state.length === 0 && !state.sync) {
	        stream.emit('data', chunk);
	        stream.read(0);
	      } else {
	        // update the buffer info.
	        state.length += state.objectMode ? 1 : chunk.length;
	        if (addToFront)
	          state.buffer.unshift(chunk);
	        else
	          state.buffer.push(chunk);

	        if (state.needReadable)
	          emitReadable(stream);
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(44).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || util.isNull(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  debug('read', n);
	  var state = this._readableState;
	  var nOrig = n;

	  if (!util.isNumber(n) || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended)
	      endReadable(this);
	    else
	      emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  }

	  if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read pushed data synchronously, then `reading` will be false,
	  // and we need to re-evaluate how much data we can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (util.isNull(ret)) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we tried to read() past the EOF, then emit end on the next tick.
	  if (nOrig !== n && state.ended && state.length === 0)
	    endReadable(this);

	  if (!util.isNull(ret))
	    this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync)
	      process.nextTick(function() {
	        emitReadable_(stream);
	      });
	    else
	      emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain &&
	        (!dest._writableState || dest._writableState.needDrain))
	      ondrain();
	  }

	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    if (false === ret) {
	      debug('false write response, pause',
	            src._readableState.awaitDrain);
	      src._readableState.awaitDrain++;
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain)
	      state.awaitDrain--;
	    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  // If listening to data, and it has not explicitly been paused,
	  // then call resume to start the flow of data on the next tick.
	  if (ev === 'data' && false !== this._readableState.flowing) {
	    this.resume();
	  }

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        var self = this;
	        process.nextTick(function() {
	          debug('readable nexttick read 0');
	          self.read(0);
	        });
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    if (!state.reading) {
	      debug('resume read 0');
	      this.read(0);
	    }
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process.nextTick(function() {
	      resume_(stream, state);
	    });
	  }
	}

	function resume_(stream, state) {
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading)
	    stream.read(0);
	}

	Readable.prototype.pause = function() {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  if (state.flowing) {
	    do {
	      var chunk = stream.read();
	    } while (null !== chunk && state.flowing);
	  }
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    debug('wrapped data');
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(13).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(53);
	/*</replacement>*/

	var Stream = __webpack_require__(17);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(48);

	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(48);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (!util.isFunction(cb))
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function() {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function() {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing &&
	        !state.corked &&
	        !state.finished &&
	        !state.bufferProcessing &&
	        state.buffer.length)
	      clearBuffer(this, state);
	  }
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      util.isString(chunk)) {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing || state.corked)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, false, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev)
	    stream._writev(chunk, state.onwrite);
	  else
	    stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      state.pendingcb--;
	      cb(er);
	    });
	  else {
	    state.pendingcb--;
	    cb(er);
	  }

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished &&
	        !state.corked &&
	        !state.bufferProcessing &&
	        state.buffer.length) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  if (stream._writev && state.buffer.length > 1) {
	    // Fast case, write everything using _writev()
	    var cbs = [];
	    for (var c = 0; c < state.buffer.length; c++)
	      cbs.push(state.buffer[c].callback);

	    // count the one we are adding, as well.
	    // TODO(isaacs) clean this up
	    state.pendingcb++;
	    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
	      for (var i = 0; i < cbs.length; i++) {
	        state.pendingcb--;
	        cbs[i](err);
	      }
	    });

	    // Clear buffer
	    state.buffer = [];
	  } else {
	    // Slow case, write chunks one-by-one
	    for (var c = 0; c < state.buffer.length; c++) {
	      var entry = state.buffer[c];
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);

	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        c++;
	        break;
	      }
	    }

	    if (c < state.buffer.length)
	      state.buffer = state.buffer.slice(c);
	    else
	      state.buffer.length = 0;
	  }

	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));

	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (util.isFunction(chunk)) {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!util.isNullOrUndefined(chunk))
	    this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else
	      prefinish(stream, state);
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(53);
	/*</replacement>*/

	var Readable = __webpack_require__(46);
	var Writable = __webpack_require__(47);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(48);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(53);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (!util.isNullOrUndefined(data))
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('prefinish', function() {
	    if (util.isFunction(this._flush))
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = __webpack_require__(49);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(53);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	function isBuffer(arg) {
	  return Buffer.isBuffer(arg);
	}
	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13).Buffer))

/***/ }
/******/ ])
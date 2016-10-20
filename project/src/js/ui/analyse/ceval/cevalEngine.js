export default function cevalEngine(opts) {

  function processOutput(text, work) {
    if (/currmovenumber|lowerbound|upperbound/.test(text)) return;
    const matches = text.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nps (\d+) .*pv (.+)/);
    if (!matches) return;
    const depth = parseInt(matches[1]);
    if (depth < opts.minDepth) return;
    var cp, mate;
    if (matches[2] === 'cp') cp = parseFloat(matches[3]);
    else mate = parseFloat(matches[3]);
    if (work.ply % 2 === 1) {
      if (matches[2] === 'cp') cp = -cp;
      else mate = -mate;
    }
    const nps = parseInt(matches[4], 10);
    const best = matches[5].split(' ')[0];
    work.emit({
      work,
      ceval: {
        depth,
        maxDepth: opts.maxDepth,
        cp,
        mate,
        best,
        nps
      }
    });
  }

  return {
    init(variant) {
      return Stockfish.init()
      .then(init.bind(undefined, variant))
      .catch(() => {
        return Stockfish.exit()
        .then(() => Stockfish.init(), () => Stockfish.init())
        .then(init.bind(undefined, variant));
      })
      .catch(console.error.bind(console));
    },

    start(work) {
      send(['position', 'fen', work.position, 'moves', work.moves].join(' '))
      .then(() => send('go depth ' + opts.maxDepth));

      Stockfish.output(function(msg) {
        // console.log(msg);
        processOutput(msg, work);
      });
    },

    stop() {
      send('stop');
    },

    exit() {
      return Stockfish.exit();
    }
  };
}

function init(variant) {
  return send('uci')
  .then(() => setOption('Ponder', 'false'))
  .then(() => prepare(variant));
}

function send(text) {
  return Stockfish.cmd(text);
}

function setOption(name, value) {
  return Stockfish.cmd(`setoption name ${name} value ${value}`);
}

function prepare(variant) {
  return Promise.all([
    setOption('UCI_Chess960', variant === 'chess960'),
    setOption('UCI_KingOfTheHill', variant === 'kingOfTheHill'),
    setOption('UCI_3Check', variant === 'threeCheck'),
    setOption('UCI_Atomic', variant === 'atomic'),
    setOption('UCI_Horde', variant === 'horde'),
    setOption('UCI_Race', variant === 'racingKings')
    // setOption('UCI_House', variant === Crazyhouse)
  ]);
}

import isEmpty from 'lodash/isEmpty';
import { hasNetwork, getBoardBounds, noop, playerName, gameIcon, oppositeColor, noNull } from '../../../utils';
import i18n from '../../../i18n';
import gameApi from '../../../lichess/game';
import gameStatusApi from '../../../lichess/status';
import variantApi from '../../../lichess/variant';
import continuePopup from '../../shared/continuePopup';
import { view as renderPromotion } from '../../shared/offlineRound/promotion';
import { header, backButton as renderBackbutton, viewOnlyBoardContent } from '../../shared/common';
import Board from '../../shared/Board';
import helper from '../../helper';
import layout from '../../layout';
import notes from '../../round/notes';
import button from '../../round/view/button';
import importPgnPopup from '../importPgnPopup';
import cevalView from '../ceval/cevalView';
import control from '../control';
import menu from '../menu';
import { defined, renderEval, isSynthetic } from '../util';
import crazyView from '../crazy/crazyView';
import explorerView from '../explorer/explorerView';
import { renderTree } from './treeView';

export default function analyseView(ctrl) {

  const isPortrait = helper.isPortrait();

  if (ctrl.data) {

    const backButton = ctrl.vm.shouldGoBack ? renderBackbutton(gameApi.title(ctrl.data) + ` • ${i18n('analysis')}`) : null;
    const title = ctrl.vm.shouldGoBack ? null : i18n('analysis');

    return layout.board(
      () => header(title, backButton),
      () => renderContent(ctrl, isPortrait),
      () => overlay(ctrl, isPortrait)
    );
  } else {
    return layout.board(
      () => header(i18n('analysis')),
      viewOnlyBoardContent
    );
  }
}

function overlay(ctrl) {
  return [
    renderPromotion(ctrl),
    menu.view(ctrl.menu),
    ctrl.notes ? notes.view(ctrl.notes) : null,
    continuePopup.view(ctrl.continuePopup),
    importPgnPopup.view(ctrl.importPgnPopup)
  ];
}

function renderContent(ctrl, isPortrait) {
  const bounds = getBoardBounds(helper.viewportDim(), isPortrait, helper.isIpadLike(), helper.isLandscapeSmall(), 'analyse');
  const ceval = ctrl.vm.step.ceval;
  const rEval = ctrl.vm.step.rEval;
  let nextBest, curBestMove, pastBest;
  if (!ctrl.explorer.enabled() && ctrl.ceval.enabled() && ctrl.vm.showBestMove) {
    nextBest = ctrl.nextStepBest();
    curBestMove = nextBest ? {
      brush: 'paleBlue',
      orig: nextBest.slice(0, 2),
      dest: nextBest.slice(2, 4)
    } : ceval && ceval.best ? {
      brush: 'paleBlue',
      orig: ceval.best.slice(0, 2),
      dest: ceval.best.slice(2, 4)
    } : null;
  }
  if (ctrl.vm.showComments) {
    pastBest = rEval && rEval.best ? {
      brush: 'paleGreen',
      orig: rEval.best.slice(0, 2),
      dest: rEval.best.slice(2, 4)
    } : null;
  }

  const nextStep = ctrl.explorer.enabled() && ctrl.analyse.getStepAtPly(ctrl.vm.step.ply + 1);
  const nextMove = nextStep ? nextStep.uci.includes('@') ? {
    brush: 'palePurple',
    orig: nextStep.uci.slice(2, 4)
  } : {
    brush: 'palePurple',
    orig: nextStep.uci.slice(0, 2),
    dest: nextStep.uci.slice(2, 4)
  } : null;

  const board = Board(
    ctrl.data,
    ctrl.chessground,
    bounds,
    isPortrait,
    null,
    null,
    nextMove ? [nextMove] : [pastBest, curBestMove].filter(noNull)
  );

  return [
    board,
    <div className="analyseTableWrapper">
      {ctrl.explorer.enabled() ?
        explorerView(ctrl) :
        renderAnalyseTable(ctrl, isPortrait)
      }
      {renderActionsBar(ctrl, isPortrait)}
    </div>
  ];
}

function renderAnalyseTable(ctrl, isPortrait) {
  const className = [
    isSynthetic(ctrl.data) ? 'synthetic' : '',
    'analyseTable'
  ].join(' ');

  return (
    <div className={className} key="analyse">
      <div className="analyse scrollerWrapper">
        {renderOpeningBox(ctrl, isPortrait)}
        {renderReplay(ctrl)}
      </div>
      {renderInfos(ctrl)}
    </div>
  );
}

function getChecksCount(ctrl, color) {
  const step = ctrl.vm.step;
  return step.checkCount[oppositeColor(color)];
}

function renderInfos(ctrl) {
  const cevalEnabled = ctrl.ceval.enabled();
  const ceval = ctrl.currentAnyEval();
  const step = ctrl.vm.step;

  const hash = '' + cevalEnabled + (ceval && renderEval(ceval.cp)) +
    (cevalEnabled && ctrl.nextStepBest()) +
    (ceval && ceval.mate) + defined(step.ceval) + ctrl.ceval.percentComplete() +
    isEmpty(step.dests) + JSON.stringify(step.checkCount) + JSON.stringify(step.crazy);

  if (ctrl.vm.infosHash === hash) return {
    subtree: 'retain'
  };
  ctrl.vm.infosHash = hash;

  return (
    <div id="analyseInfos" className="analyseInfos scrollerWrapper">
      { cevalEnabled ?
        cevalView.renderCeval(ctrl) : null
      }
      { !isSynthetic(ctrl.data) ?
        <div className="native_scroller">
          {gameInfos(ctrl)}
          {renderOpponents(ctrl)}
        </div> : null
      }
    </div>
  );
}

function renderRatingDiff(player) {
  if (typeof player.ratingDiff === 'undefined') return null;
  if (player.ratingDiff === 0) return <span className="rp null"> +0</span>;
  if (player.ratingDiff > 0) return <span className="rp up"> + {player.ratingDiff}</span>;
  if (player.ratingDiff < 0) return <span className="rp down"> {player.ratingDiff}</span>;

  return null;
}

function renderOpponents(ctrl) {
  if (isSynthetic(ctrl.data)) return null;

  const player = ctrl.data.player;
  const opponent = ctrl.data.opponent;
  if (!player || !opponent) return null;

  const isCrazy = !!ctrl.vm.step.crazy;

  return (
    <div className="analyseOpponentsWrapper">
      <div className="analyseOpponent">
        <div className={'analysePlayerName' + (isCrazy ? ' crazy' : '')}>
          <span className={'color-icon ' + player.color} />
          {playerName(player, true)}
          {renderRatingDiff(player)}
        </div>
        { ctrl.data.game.variant.key === 'threeCheck' && ctrl.vm.step.checkCount ?
          ' (' + getChecksCount(ctrl, player.color) + ')' : null
        }
        {crazyView.pocket(ctrl, ctrl.vm.step.crazy, player.color, 'top')}
      </div>
      <div className="analyseOpponent">
        <div className={'analysePlayerName' + (isCrazy ? ' crazy' : '')}>
          <span className={'color-icon ' + opponent.color} />
          {playerName(opponent, true)}
          {renderRatingDiff(opponent)}
        </div>
        { ctrl.data.game.variant.key === 'threeCheck' && ctrl.vm.step.checkCount ?
          ' (' + getChecksCount(ctrl, opponent.color) + ')' : null
        }
        {crazyView.pocket(ctrl, ctrl.vm.step.crazy, opponent.color, 'bottom')}
      </div>
    </div>
  );
}

function renderOpeningBox(ctrl, isPortrait) {
  const opening = ctrl.data.game.opening;

  const hash = '' + (opening && opening.eco + opening.name) + isPortrait;

  if (ctrl.vm.openingHash === hash) {
    return {
      subtree: 'retain'
    };
  }
  ctrl.vm.openingHash = hash;

  if (!isPortrait && opening) {
    const config = helper.ontouch(noop, () =>
      window.plugins.toast.show(opening.eco + ' ' + opening.name, 'short', 'center'));

    return (
      <div className="analyseOpening" config={config}>
        <strong>{opening.eco}&nbsp;</strong>
        <span>{opening.name}</span>
      </div>
    );
  }

  return null;
}

function renderReplay(ctrl) {

  var result;
  if (ctrl.data.game.status.id >= 30) switch (ctrl.data.game.winner) {
    case 'white':
      result = '1-0';
      break;
    case 'black':
      result = '0-1';
      break;
    default:
      result = '½-½';
  }
  const tree = renderTree(ctrl, ctrl.analyse.tree);
  if (result) {
    tree.push(<div key="gameResult" className="result">{result}</div>);
    const winner = gameApi.getPlayer(ctrl.data, ctrl.data.game.winner);
    tree.push(
      <div key="gameStatus" className="status">
        {gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key)}

        {winner ? '. ' + i18n(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : null}
      </div>
    );
  }

  return (
    <div id="replay" className="analyseReplay native_scroller">
      {tree}
    </div>
  );
}

function gameInfos(ctrl) {
  if (isSynthetic(ctrl.data)) return null;
  if (ctrl.vm.step.crazy) return null;

  const data = ctrl.data;
  const time = gameApi.time(data);
  const mode = data.game.offline ? i18n('offline') :
    data.game.rated ? i18n('rated') : i18n('casual');
  const icon = data.opponent.ai ? ':' : gameIcon(data.game.perf || data.game.variant.key);
  const variantLink = helper.ontouch(
    () => {
      const link = variantApi(data.game.variant.key).link;
      if (link)
        window.open(link, '_blank');
    },
    () => window.plugins.toast.show(data.game.variant.title, 'short', 'center')
  );

  return (
    <div className="analyseGameInfosWrapper">
      <div className="analyseGameInfos" data-icon={icon}>
        {time + ' • '}
        <span className="variant" config={variantLink}>
          {data.game.variant.name}
        </span>
        <br/>
        {mode}
      </div>
    </div>
  );
}

function buttons(ctrl) {
  return [
      ['first', 'fast-backward', control.first ],
      ['prev', 'backward', control.prev],
      ['next', 'forward', control.next],
      ['last', 'fast-forward', control.last]
    ].map(function(b) {
      const className = [
        'action_bar_button',
        'fa',
        'fa-' + b[1],
        ctrl.broken ? 'disabled' : '',
        ctrl.vm.late && b[0] === 'last' ? 'glow' : ''
        ].join(' ');
        const action = b[0] === 'prev' || b[0] === 'next' ?
          helper.ontouch(() => b[2](ctrl), null, () => b[2](ctrl)) :
          helper.ontouch(() => b[2](ctrl));
        return (
          <button className={className} key={b[1]} config={action} />
        );
    });
}

function renderActionsBar(ctrl) {

  const hash = ctrl.data.game.id + ctrl.broken + ctrl.vm.late + ctrl.explorer.enabled();

  if (ctrl.vm.buttonsHash === hash) return {
    subtree: 'retain'
  };
  ctrl.vm.buttonsHash = hash;

  const sharePGN = helper.ontouch(
    ctrl.sharePGN,
    () => window.plugins.toast.show('Share PGN', 'short', 'bottom')
  );

  const explorerBtnClass = [
    'action_bar_button',
    'fa',
    'fa-book',
    ctrl.explorer.enabled() ? 'highlight' : ''
  ].join(' ');

  return (
    <section className="actions_bar">
      <button className="action_bar_button fa fa-ellipsis-h" key="analyseMenu"
        config={helper.ontouch(ctrl.menu.open)}
      />
      {ctrl.source === 'offline' || !gameApi.playable(ctrl.data) ?
        <button className="action_bar_button fa fa-share-alt" key="sharePGN"
          config={sharePGN}
        /> : null
      }
      {ctrl.notes ? button.notes(ctrl) : null}
      {hasNetwork() ?
        <button className={explorerBtnClass} key="explorer"
          config={helper.ontouch(
            ctrl.explorer.toggle,
            () => window.plugins.toast.show('Opening explorer & tablebase', 'short', 'bottom')
          )}
        /> : null
      }
      <button className="action_bar_button" data-icon="B" key="flipBoard"
        config={helper.ontouch(
          ctrl.flip,
          () => window.plugins.toast.show(i18n('flipBoard'), 'short', 'bottom')
        )}
      />
      {buttons(ctrl)}
    </section>
  );
}
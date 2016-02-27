import gameApi from '../../../lichess/game';
import gameStatus from '../../../lichess/status';
import helper from '../../helper';
import throttle from 'lodash/function/throttle';
import i18n from '../../../i18n';
import socket from '../../../socket';
import { getPGN } from '../roundXhr';
import { handleXhrError, hasNetwork } from '../../../utils';
import lobby from '../../lobby';
import m from 'mithril';

export default {
  standard: function(ctrl, condition, icon, hint, socketMsg) {
    return condition(ctrl.data) && hasNetwork() ? m('button', {
      key: socketMsg,
      className: socketMsg,
      'data-icon': icon,
      config: helper.ontouch(function() { socket.send(socketMsg); })
    }, i18n(hint)) : null;
  },
  shareLink: function(ctrl) {
    return m('button', {
      key: 'shareGameLink',
      config: helper.ontouch(function() {
        window.plugins.socialsharing.share(null, null, null, gameApi.publicUrl(ctrl.data));
      })
    }, [m('span.fa.fa-link'), i18n('shareGameURL')]);
  },
  sharePGN: function(ctrl) {
    function handler() {
      getPGN(ctrl.data.game.id).then(function(PGN) {
        window.plugins.socialsharing.share(PGN);
      }, err => handleXhrError(err));
    }
    return (
      <button key="sharePGN" config={helper.ontouch(handler)}>
        <span className="fa fa-share-alt" />
        {i18n('sharePGN')}
      </button>
    );
  },
  submitMove: function(ctrl) {
    return (
      <div>
        <button className="binary_choice" data-icon="E"
          config={helper.ontouch(ctrl.submitMove.bind(undefined, true))}
        >
          Submit move
        </button>
        <button className="binary_choice" data-icon="L"
          config={helper.ontouch(ctrl.submitMove.bind(undefined, false))}
        >
          {i18n('cancel')}
        </button>
      </div>
    );
  },
  forceResign: function(ctrl) {
    return gameApi.forceResignable(ctrl.data) ?
      m('div.force_resign_zone.clearfix', {
        key: 'forceResignZone'
      }, [
        m('div.notice', i18n('theOtherPlayerHasLeftTheGameYouCanForceResignationOrWaitForHim')),
        m('button.binary_choice[data-icon=E]', {
          config: helper.ontouch(function() { socket.send('resign-force'); })
        }, i18n('forceResignation')),
        m('button.binary_choice[data-icon=E]', {
          config: helper.ontouch(function() { socket.send('draw-force'); })
        }, i18n('forceDraw'))
      ]) : null;
  },
  threefoldClaimDraw: function(ctrl) {
    return (ctrl.data.game.threefold) ? m('div.claim_draw_zone', {
      key: 'claimDrawZone'
    }, [
      m('div.notice', i18n('threefoldRepetition')),
      m.trust('&nbsp;'),
      m('button[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('draw-claim'); })
      }, i18n('claimADraw'))
    ]) : null;
  },
  cancelDrawOffer: function(ctrl) {
    if (ctrl.data.player.offeringDraw) return m('div.negotiation', {
      key: 'cancelDrawOfferZone'
    }, [
      m('div.notice', i18n('drawOfferSent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('draw-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentDrawOffer: function(ctrl) {
    if (ctrl.data.opponent.offeringDraw) return m('div.negotiation.clearfix', {
      key: 'answerDrawOfferZone'
    }, [
      m('div.notice', i18n('yourOpponentOffersADraw')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('draw-yes'); })
      }, i18n('accept')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('draw-no'); })
      }, i18n('decline'))
    ]);
  },
  cancelTakebackProposition: function(ctrl) {
    if (ctrl.data.player.proposingTakeback) return m('div.negotiation', {
      key: 'cancelTakebackPropositionZone'
    }, [
      m('div.notice', i18n('takebackPropositionSent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('takeback-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentTakebackProposition: function(ctrl) {
    if (ctrl.data.opponent.proposingTakeback) return m('div.negotiation.clearfix', {
      key: 'answerTakebackPropositionZone'
    }, [
      m('div.notice', i18n('yourOpponentProposesATakeback')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('takeback-yes'); })
      }, i18n('accept')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('takeback-no'); })
      }, i18n('decline'))
    ]);
  },
  newOpponent: function(ctrl) {
    const d = ctrl.data;
    const newable = (gameStatus.finished(d) || gameStatus.aborted(d)) && d.game.source === 'lobby';
    if (!ctrl.data.opponent.ai && newable) {
      return m('button[data-icon=r]', {
        config: helper.ontouch(() => {
          ctrl.hideActions();
          lobby.startSeeking();
        })
      }, i18n('newOpponent'));
    }
  },
  rematch: function(ctrl) {
    const d = ctrl.data;
    const rematchable = !d.game.rematch && (gameStatus.finished(d) || gameStatus.aborted(d)) && !d.tournament && !d.simul && !d.game.boosted && (d.opponent.onGame || (!d.game.clock && d.player.user && d.opponent.user));
    if (!ctrl.data.opponent.offeringRematch && !ctrl.data.player.offeringRematch && rematchable) {
      return m('button.fa.fa-refresh', {
        key: 'rematch',
        config: helper.ontouch(function() { socket.send('rematch-yes'); })
      }, i18n('rematch'));
    } else {
      return null;
    }
  },
  answerOpponentRematch: function(ctrl) {
    if (ctrl.data.opponent.offeringRematch) return m('div.negotiation.clearfix', {
      key: 'answerOpponentRematchZone'
    }, [
      m('div.notice', i18n('yourOpponentWantsToPlayANewGameWithYou')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('rematch-yes'); })
      }, i18n('joinTheGame')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('rematch-no'); })
      }, i18n('declineInvitation'))
    ]);
  },
  cancelRematch: function(ctrl) {
    if (ctrl.data.player.offeringRematch) return m('div.negotiation', {
      key: 'cancelRematchZone'
    }, [
      m('div.notice', i18n('rematchOfferSent')),
      m('div.notice', i18n('waitingForOpponent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('rematch-no'); })
      }, i18n('cancelRematchOffer'))
    ]);
  },
  moretime: function(ctrl) {
    if (gameApi.moretimeable(ctrl.data)) return m('button[data-icon=O]', {
      key: 'moretime',
      config: helper.ontouch(throttle(function() { socket.send('moretime'); }, 600))
    }, i18n('giveNbSeconds', 15));
  },
  flipBoardInMenu: function(ctrl) {
    if (ctrl.data.game.speed === 'correspondence') {
      const className = helper.classSet({
        on: ctrl.vm.flip
      });
      return (
        <button className={className} data-icon="B" key="flipboard"
          config={helper.ontouch(ctrl.flip)}>
          {i18n('flipBoard')}
        </button>
      );
    }
  },
  flipBoard: function(ctrl) {
    const className = helper.classSet({
      'action_bar_button': true,
      highlight: ctrl.vm.flip
    });
    return (
      <button className={className} data-icon="B" key="flipboard"
        config={helper.ontouch(ctrl.flip)} />
    );
  },
  first: function(ctrl) {
    const prevPly = ctrl.vm.ply - 1;
    const enabled = ctrl.vm.ply !== prevPly && prevPly >= ctrl.firstPly();
    const className = helper.classSet({
      'action_bar_button': true,
      'fa': true,
      'fa-fast-backward': true,
      disabled: ctrl.broken || !enabled
    });
    return (
      <button className={className} key="fast-backward"
        config={helper.ontouch(ctrl.jumpFirst)} />
    );
  },
  backward: function(ctrl) {
    const prevPly = ctrl.vm.ply - 1;
    const enabled = ctrl.vm.ply !== prevPly && prevPly >= ctrl.firstPly();
    const className = helper.classSet({
      'action_bar_button': true,
      'fa': true,
      'fa-backward': true,
      disabled: ctrl.broken || !enabled
    });
    return (
      <button className={className} key="backward"
        config={helper.ontouch(ctrl.jumpPrev, null, ctrl.jumpPrev)} />
    );
  },
  forward: function(ctrl) {
    const nextPly = ctrl.vm.ply + 1;
    const enabled = ctrl.vm.ply !== nextPly && nextPly <= ctrl.lastPly();
    const className = helper.classSet({
      'action_bar_button': true,
      'fa': true,
      'fa-forward': true,
      disabled: ctrl.broken || !enabled
    });
    return (
      <button className={className} key="forward"
        config={helper.ontouch(ctrl.jumpNext, null, ctrl.jumpNext)} />
    );
  },
  last: function(ctrl) {
    const nextPly = ctrl.vm.ply + 1;
    const enabled = ctrl.vm.ply !== nextPly && nextPly <= ctrl.lastPly();
    const className = helper.classSet({
      'action_bar_button': true,
      'fa': true,
      'fa-fast-forward': true,
      disabled: ctrl.broken || !enabled
    });
    return (
      <button className={className} key="fast-forward"
        config={helper.ontouch(ctrl.jumpLast)} />
    );
  },
  notes: function(ctrl) {
    return m('button[data-icon=m].action_bar_button', {
      config: helper.ontouch(ctrl.notes.open)
    });
  }
};

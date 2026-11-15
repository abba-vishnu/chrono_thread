(function (CG) {
  const st = CG.state;
  const dom = CG.dom;

  let primaryKeyHeld = false;
  let boostKeyHeld = false;
  let mouseBoostHeld = false;
  const primaryTouchIds = new Set();
  const boostPointerIds = new Set();

  CG.isHoldingPrimary = function () {
    return primaryKeyHeld || primaryTouchIds.size > 0;
  };

  CG.isBoostRequested = function () {
    return boostKeyHeld || mouseBoostHeld || boostPointerIds.size > 0;
  };

  CG.syncBoostButtonVisual = function () {
    if (st.staminaLockoutFrames > 0) {
      dom.snapBtn.classList.add('locked-out');
      dom.snapBtn.classList.remove('active');
      dom.snapBtn.innerHTML = `COOLING<br>${(st.staminaLockoutFrames / 60).toFixed(1)}s`;
    } else {
      dom.snapBtn.classList.remove('locked-out');
      dom.snapBtn.textContent = 'SURGE';
      if (CG.isBoostRequested() && !st.gameOver && !st.isPaused) dom.snapBtn.classList.add('active');
      else dom.snapBtn.classList.remove('active');
    }
  };

  CG.clearAllInputs = function () {
    primaryKeyHeld = false;
    boostKeyHeld = false;
    mouseBoostHeld = false;
    primaryTouchIds.clear();
    boostPointerIds.clear();
    CG.syncBoostButtonVisual();
  };

  function canDismissGameOver() {
    return st.gameOver && (performance.now() - st.gameOverTimestamp > 420);
  }

  CG.bindInputs = function () {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (st.isPaused) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (st.gameOver) {
          if (canDismissGameOver()) CG.resetGame();
          return;
        }
        primaryKeyHeld = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (!st.gameOver) {
          boostKeyHeld = true;
          CG.syncBoostButtonVisual();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        primaryKeyHeld = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        boostKeyHeld = false;
        CG.syncBoostButtonVisual();
      }
    });

    window.addEventListener('blur', CG.clearAllInputs);

    if (dom.restartBtn) {
      dom.restartBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        CG.resetGame();
      });
      dom.restartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        CG.resetGame();
      });
    }

    if (dom.gameoverOverlay) {
      dom.gameoverOverlay.addEventListener('pointerdown', (e) => {
        if (e.target === dom.restartBtn || dom.restartBtn.contains(e.target)) return;
        if (canDismissGameOver()) {
          e.preventDefault();
          CG.resetGame();
        }
      });
    }

    dom.gameStage.addEventListener('mousedown', (e) => {
      if (st.isPaused || st.gameOver) return;
      if (e.target === dom.snapBtn || dom.snapBtn.contains(e.target)) return;
      if (e.target === dom.scoreEl || dom.scoreEl.contains(e.target)) return;
      if (e.target.closest('#playtest-controls')) return;
      if (e.target.closest('#gameover-overlay')) return;
      if (e.button === 0) {
        mouseBoostHeld = true;
        CG.syncBoostButtonVisual();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && mouseBoostHeld) {
        mouseBoostHeld = false;
        CG.syncBoostButtonVisual();
      }
    });

    dom.snapBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (st.isPaused) return;
      if (st.gameOver) {
        if (canDismissGameOver()) CG.resetGame();
        return;
      }
      boostPointerIds.add(e.pointerId);
      try { dom.snapBtn.setPointerCapture(e.pointerId); } catch (_) {}
      CG.syncBoostButtonVisual();
    });

    function releaseBoostPointer(e) {
      if (boostPointerIds.has(e.pointerId)) {
        boostPointerIds.delete(e.pointerId);
        try { dom.snapBtn.releasePointerCapture(e.pointerId); } catch (_) {}
        CG.syncBoostButtonVisual();
      }
    }

    dom.snapBtn.addEventListener('pointerup', releaseBoostPointer);
    dom.snapBtn.addEventListener('pointercancel', releaseBoostPointer);

    dom.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (st.isPaused) return;
      if (st.gameOver) {
        if (canDismissGameOver()) CG.resetGame();
        return;
      }
      for (const touch of e.changedTouches) {
        primaryTouchIds.add(touch.identifier);
      }
    }, { passive: false });

    function endPrimaryTouches(e) {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        primaryTouchIds.delete(touch.identifier);
      }
    }

    dom.canvas.addEventListener('touchend', endPrimaryTouches, { passive: false });
    dom.canvas.addEventListener('touchcancel', endPrimaryTouches, { passive: false });
  };
})(window.ChronoGame);

/* eslint-disable
   func-names, no-underscore-dangle, no-plusplus, no-bitwise, no-param-reassign, no-shadow */

/**
 * Windows XP Solitaire Win Animation
 * A PEN BY Bailey Parker
 * https://codepen.io/baileyparker/pen/KZbzVm
 */

const WIDTH = 585;
const HEIGHT = 368;
const CARD_WIDTH = 66;
const CARD_HEIGHT = 110;
const SECS_PER_FRAME = 8.33; // sec/frame
const GRAVITY = 5; // pixels/sec^2
const DAMPENING = 0.7;

const canvas = document.getElementById('cardwin-canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d');
const cardsImage = document.getElementById('cardwin-cards');

const Card = /** @class */ (function () {
  function Card(drawer, suit, rank, x, y) {
    this._drawer = drawer;
    this.suit = suit;
    this.rank = rank;
    this.x = x;
    this.y = y;
  }
  Card.prototype.draw = function () {
    this._drawer.draw([this.suit, this.rank], this.x, this.y);
  };
  Card.prototype.isOffscreen = function () {
    return this.x <= -CARD_WIDTH || this.x > WIDTH;
  };
  return Card;
}());

const Cards = /** @class */ (function () {
  function Cards(ctx, image) {
    this._ctx = ctx;
    this._image = image;
    this._imageWidth = image.width;
    this._imageHeight = image.height;
  }
  Cards.prototype.makeFoundations = function () {
    const _this = this;
    const numCards = this._image.naturalWidth / CARD_WIDTH;
    const cards = [];
    for (let _i = 0; _i < 50; _i++) {
      const rank = Math.floor(Math.random() * numCards);
      const offsetY = (rank / 4) | 0;
      const offsetX = offsetY * 2;
      const newCard = (function () {
        const x = WIDTH - ((CARD_WIDTH + 10) * 4);
        return new Card(_this, 0, rank, x + offsetX, 5 + offsetY);
      }());
      cards.push(newCard);
    }
    return cards;
  };
  Cards.prototype.draw = function (_a, dx, dy) {
    const suit = _a[0];
    const rank = _a[1];
    const sx = ((suit * 13) + rank) * CARD_WIDTH;
    this.drawCardAt(sx, dx, dy);
  };
  Cards.prototype.drawCardAt = function (sx, dx, dy) {
    this._ctx.drawImage(
      this._image,
      sx,
      0,
      CARD_WIDTH,
      CARD_HEIGHT,
      dx,
      dy,
      CARD_WIDTH,
      CARD_HEIGHT,
    );
  };
  return Cards;
}());

const CardAnimation = /** @class */ (function () {
  function CardAnimation(card, dx, dy) {
    this.card = card;
    this.dx = dx;
    this.dy = dy;
  }
  CardAnimation.makeRandom = function (card) {
    const dir = Math.round(Math.random());
    const dx = ((Math.random() * 2) + 2) * (dir ? 1 : -1);
    const dy = Math.random() * -10;
    return new CardAnimation(card, dx, dy);
  };
  /**
   * Take a step of animation (frame).
   * @returns true if the card's animation is done, false otherwise
   */
  CardAnimation.prototype.step = function () {
    // Return false to indicate that the card should no longer be animated
    if (this.card.isOffscreen()) {
      return false;
    }
    // Update card position with velocity
    this.card.x += this.dx;
    this.card.y += this.dy;
    // If we've hit (or passed) the floor, bounce
    if (this.card.y + CARD_HEIGHT >= HEIGHT) {
      this.dy *= -DAMPENING;
      // Prevent card from getting stuck below the floor (which very
      // quickly dampens dy to 0)
      this.card.y = HEIGHT - CARD_HEIGHT;
    } else {
      // Otherwise, apply gravity
      this.dy += GRAVITY / SECS_PER_FRAME;
    }
    this.card.draw();
    // The card moved in this frame, so we may have more to animate
    return true;
  };
  return CardAnimation;
}());

/**
 * Represents the composite animation of all 52 cards.
 */
const Animation = /** @class */ (function () {
  function Animation(remainingCards) {
    this._remainingCards = remainingCards;
    this._remainder = 0;
  }
  /**
   * Update the individual card animations one at a time (frame by frame)
   * until complete (or there isn't enough delta left to proceed to the
   * next frame). Keeps track of remainder delta for next call to update.
   *.
    * @returns true if there still are cards to animate
    */
  Animation.prototype.update = function (delta) {
    // Include sub SEC_PER_FRAME time from last update
    delta += this._remainder;
    while (this._remainingCards.length > 0 && delta >= SECS_PER_FRAME) {
      const card = this._remainingCards[this._remainingCards.length - 1];
      if (!card.step()) {
        // When cards don't animate, they are offscreen. So, we can
        // proceed to animating the next card
        this._remainingCards.pop();
      } else {
        // We discretize the delta into frames of length SEC_PER_FRAME
        delta -= SECS_PER_FRAME;
      }
    }
    // Keep track of any leftover time for the next update
    this._remainder = delta;
    return this._remainingCards.length > 0;
  };
  return Animation;
}());

/**
 * @param ctx   Game canvas 2d context
 * @param cards The cards spritemap
 * @param deck  The 52 cards in rank order (already positioned in the
 *              foundation stacks--A to K in stacks of Spades, Diamonds,
 *              Clubs, Hearts)
 */
function drawInitialState(ctx, cards, deck) {
  // Background
  ctx.fillStyle = '#e1e1e1';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  deck.map(c => c.draw());
}

/**
 * Starts the card bounce winning animation.
 * @param deck An array of cards in the order that they will be animated
 */
function startAnimation(deck) {
  // Create random animations for all 52 cards
  const cardAnimations = deck.map(c => CardAnimation.makeRandom(c));
  const animation = new Animation(cardAnimations);
  // Start updating the animation
  let last = null;
  const raf = window.requestAnimationFrame || (f => window.setTimeout(() => f(Date.now()), 33));
  raf(function update(now) {
    const delta = now - (last == null ? now : last);
    last = now;
    // Continue animating if there are cards left
    if (animation.update(delta)) {
      raf(update);
    } else {
      setTimeout(() => {
        // eslint-disable-next-line no-use-before-define
        onLoad(ctx, cardsImage);
      }, 1000);
    }
  });
}

function onLoad(ctx, cardsImage) {
  // eslint-disable-next-line no-console
  console.log('loading cardwin');
  // Create deck
  const cards = new Cards(ctx, cardsImage);
  const deck = cards.makeFoundations();
  drawInitialState(ctx, cards, deck);
  startAnimation(deck);
}

let canvasIsVisible = false;
let imageIsLoaded = false;
let cardWinLoaded = false;

function tryLoad() {
  if (canvasIsVisible && imageIsLoaded && !cardWinLoaded) {
    cardWinLoaded = true;
    onLoad(ctx, cardsImage);
  }
}

if (cardsImage.complete) {
  imageIsLoaded = true;
  tryLoad();
} else {
  cardsImage.onload = () => {
    imageIsLoaded = true;
    tryLoad();
  };
}

function elementInViewport2(el) {
  const width = el.offsetWidth;
  const height = el.offsetHeight;

  let top = el.offsetTop;
  let left = el.offsetLeft;

  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top < window.pageYOffset + window.innerHeight &&
    left < window.pageXOffset + window.innerWidth &&
    top + height > window.pageYOffset &&
    left + width > window.pageXOffset
  );
}

document.addEventListener('scroll', () => {
  canvasIsVisible = elementInViewport2(canvas);
  tryLoad();
});

canvasIsVisible = elementInViewport2(canvas);
tryLoad();

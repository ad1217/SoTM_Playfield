let deckName, deckJSON, cardCount, deckWidth, deckHeight,
    piles = {'deck': [], discard: []};

window.addEventListener('load', () => {
  let xhr = new XMLHttpRequest();
  xhr.addEventListener("load", () => {
    deckJSON = JSON.parse(xhr.responseText);
    piles.deck = deckJSON.ObjectStates[0].DeckIDs.map(c => c - 100);
    cardCount = piles['deck'].length;
    shuffle(piles['deck']);
    deckWidth = deckJSON.ObjectStates[0].CustomDeck["1"].NumWidth;
    deckHeight = deckJSON.ObjectStates[0].CustomDeck["1"].NumHeight;
    console.log(deckName);
  });
  deckName = document.querySelector('#card-container').getAttribute("data-deckName");
  xhr.open("GET", "/deck/" + deckName + "/deck.json");
  xhr.send();

  window.addEventListener("contextmenu", event =>  event.preventDefault());
});

let cardInteract = interact('.card', {ignoreFrom: '.in-list'})
  .draggable({
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },

    snap: {
      targets: [() => {
        // TODO: maybe change to dropzone?
        let pos = document.body.getBoundingClientRect(),
            hand = document.getElementById('hand'),
            style = window.getComputedStyle(hand),
            handHeight = parseInt(style.getPropertyValue("height"));
        return {y: pos.bottom,
                range: handHeight/2};
      }],
      relativePoints: [{x: 0.5 , y: 1}]
    },

    onmove: dragMoveListener
  })
  .on('doubletap', event => {
    let scale = parseFloat(event.target.getAttribute('data-scale')) === 2 ? 1 : 2;
    event.target.setAttribute('data-scale', scale);
	dragMoveListener({target: event.target, dx: 0, dy: 0});
  });

interact('.card-pile')
  .dropzone({
    accept: '.card',
    ondrop: event => {
      let pileName = event.target.getAttribute('data-pile');
      piles[pileName].push(event.relatedTarget.getAttribute('data-num'));
      event.relatedTarget.parentElement.removeChild(event.relatedTarget);

      // update deck text
      event.target.innerHTML = `${pileName.toUpperCase()}<br>${piles[pileName].length}/${cardCount}`;
    }
  })
  .draggable({manualStart: true})
  .on('move', event => {
    let interaction = event.interaction;
    let pileName = event.target.getAttribute('data-pile');
    let pile = piles[pileName];

    // if the pointer was moved while being held down
    // and an interaction hasn't started yet
    // and there are cards in the pile
    if (interaction.pointerIsDown &&
        !interaction.interacting() &&
        pile.length > 0) {
      // draw a new card
      let newCard = makeCard(pile.pop());
      newCard.style.position = "fixed";
      newCard.style.top = event.pageY;
      newCard.style.left = event.pageX;
      // insert the card to the page
      document.querySelector("#card-container").appendChild(newCard);

      // update deck text
      event.target.innerHTML = `${pileName.toUpperCase()}<br>${pile.length}/${cardCount}`;

      // start a drag interaction targeting the clone
      interaction.start({name: 'drag'}, cardInteract, newCard);
    }
  })
  .on('hold', event => {
    let pile = piles[event.target.getAttribute('data-pile')];
    let searchBox = document.createElement('input');
    let container = document.createElement('div');
    let cardList = document.createElement('div');
    searchBox.setAttribute('type', 'search');
    searchBox.setAttribute('placeholder', 'Filter');
    searchBox.addEventListener('input', event => {
      for (var ii = 0; ii < cardList.children.length; ii++) {
        let input = event.target.value;
        let cardNum = parseInt(cardList.children[ii].getAttribute('data-num'));
        let cardData = deckJSON.ObjectStates[0].ContainedObjects.find(c => c.CardID === (cardNum + 100));
        cardList.children[ii].style.display =
          (cardData.Nickname.toLowerCase().includes(input.toLowerCase()) ||
           cardData.Description.toLowerCase().includes(input.toLowerCase())) ?
          "": "none";
      }
    });
    container.appendChild(searchBox);

    pile.forEach(cardNum => {
      let newCard = makeCard(cardNum);
      newCard.classList.add('in-list');
      newCard.addEventListener('click', event => {
        // re-parent
        event.target.parentElement.removeChild(event.target);
        document.querySelector("#card-container").appendChild(event.target);

        // remove list class
        event.target.classList.remove('in-list');

        // fix position
        newCard.style.position = "fixed";

        // remove from source pile
        let cardNum = parseInt(event.target.getAttribute('data-num'));
        let index = pile.indexOf(cardNum);
        if (index > -1) {
          pile.splice(index, 1);
        }
      }, {once: true});
      cardList.appendChild(newCard);
    });
    container.appendChild(cardList);
    showModal(container);
  })
  .on('tap', event => shuffle(piles[event.target.getAttribute('data-pile')]));

function makeCard(cardNum) {
  // draw a new card
  let card = document.createElement('div');
  card.className = "card";

  // temporary add so getComputedStyle works on Chrome
  document.body.appendChild(card);
  let style = window.getComputedStyle(card);
  card.setAttribute('data-num', cardNum);
  card.style.backgroundPositionX =
    -(cardNum % deckWidth) * parseInt(style.getPropertyValue("width")) + "px";
  card.style.backgroundPositionY =
    -Math.floor(cardNum/deckHeight) * parseInt(style.getPropertyValue("height")) + "px";
  card.style.backgroundImage = "url('deck.png')";
  card.style.backgroundSize = `${deckWidth * 100}% ${deckHeight * 100}%`;
  document.body.removeChild(card);

  return card;
}

function showModal(content) {
  let shade = document.createElement('div');
  shade.id = "shade";
  shade.className = "modal";
  shade.addEventListener('click', hideModal);
  document.body.appendChild(shade);

  let modal = document.createElement('div');
  modal.id = "modal-content";
  modal.className = "modal";
  modal.appendChild(content);
  document.body.appendChild(modal);
}

function hideModal() {
  document.querySelectorAll('.modal').forEach(
    e => e.parentElement.removeChild(e));
}

// Fisher-Yates shuffle from https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  let m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

function dragMoveListener (event) {
  let target = event.target,
      // keep the dragged position in the data-x/data-y attributes
      x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
      y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
      scale = (parseFloat(target.getAttribute('data-scale')) || 1);

  // translate and scale the element
  target.style.webkitTransform =
    target.style.transform =
    'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';

  // raise to top
  target.parentElement.removeChild(target);
  document.querySelector("#card-container").appendChild(target);

  // update the posiion attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

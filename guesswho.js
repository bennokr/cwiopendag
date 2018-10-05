/*

# Wie is Het?

First, generate faces from attributes file.
Then, 

*/

const histogram = function(a){ return a.reduce((h, v)=>{h[v]=h[v]+1||1; return h}, {})};
const argmax = function(a){ return Object.keys(a).reduce((x, y)=>(a[x] > a[y] ? x : y))};
const sum = function(a){ return a.reduce((x, y)=>(x + y))};

window.face = {};
window.face_valid = {};
window.attrs = {};
window.q = {};
window.n = 12;

window.opponent_choice = null;

function template(name, value) {
  var tmpl = $('#'+name).html();
  Mustache.parse(tmpl);
  return $(Mustache.render(tmpl, value))
}

function init() {
  window.opponent_choice = Math.floor(Math.random() * window.n);

  $.getJSON( "attributes.json", function( data ) {
    console.log('attributes file', data);
    // Make distinct faces
    while (Object.keys(window.face).length < n) {
      var face_obj = {'attrs':[]};
      // Add attributes randomly
      Object.keys(data).forEach(function(key) {
        const options = data[key].options; // attribute subtypes
        window.attrs[key] = (window.attrs[key] || {});
        options.forEach(function(option){
          option.props.forEach(function(prop){
            window.attrs[key][prop] = true;
          });
        });
        if (Math.random() < data[key].p) { // attribute probability
          const index = Math.floor(Math.random() * options.length);
          face_obj.attrs.push({
            'type':key, 
            'props':options[index].props,
            'img':options[index].img
          });
        }
      });
      const exists = Object.keys(window.face).some(function(i){ 
        return JSON.stringify(face_obj) === JSON.stringify(window.face[i]) 
      });
      if (!exists) {
        const i = Object.keys(window.face).length
        window.face[i] = face_obj;
        window.face_valid[i] = true;
      }
    }
    Object.keys(window.face).forEach(function(i){ window.face[i].i = i; })
    console.log('faces', window.face);
    console.log('attrs', window.attrs);

    $('#face_container').append(template('face_grid_tmpl', Object.values(window.face)));

    player_turn();
  });
}


function opponent_turn() {
  var propattr_counts = {};
  Object.keys(window.face).forEach(function(i){
    if (window.face_valid[i]) {
      window.face[i].attrs.forEach(function(attr){
        propattr_counts[attr.type] = (propattr_counts[attr.type] || 0) + 1;
        attr.props.forEach(function(prop){
          var propattr = prop + ' ' + attr.type;
          propattr_counts[propattr] = (propattr_counts[propattr] || 0) + 1;
        })
      })
    }
  })

  // Get splitting power
  var propattr_entropy = {}
  var n_game = sum(Object.values(window.face_valid).map(function(x){return x?1:0 }))
  if (n_game == 1) {
    
    // OPPONENT WINS
    console.log('ik win')

  } else {
    Object.keys(propattr_counts).forEach(function(a){
      propattr_entropy[a] = -Math.abs( propattr_counts[a] - n_game/2 );
    })
    var propattr = argmax(propattr_entropy);
    propattr = propattr.split(' ');
    if (propattr.length>1) {
      var prop = propattr[0], attr = propattr[1]; 
    } else {
      var prop = null, attr = propattr[0];
    }

    setTimeout(function(){
      $('#conversation').append(template('q_tmpl', 
        {'side':'opponent', 'prop':prop, 'attr':attr} ));
      $('#conversation').append(template('opponent_tmpl', null ));
      $('#conversation').stop().animate({
        scrollTop: $('#conversation')[0].scrollHeight
      }, 80);
      $('#current_player>input').click(function(e){
        // player answers opponents question
        var ans = (e.target.value == 'Ja');

        // Update game board
        // filter out faces without this att
        Object.keys(window.face).forEach(function(i){
          var face_match = false;
          window.face[i].attrs.forEach(function(a){
            var match = (a.type == attr && (!prop || a.props.some(function(p){ return p==prop })))
            if (match) { face_match = true }
          }) 
          if (face_match != ans) {
            window.face_valid[i] = false;
            $('[data-i="'+i+'"] > .you-tick').css('visibility','visible');
          }
        })
        $('#current_player').replaceWith($('<div class="player">' + (ans? 'Ja' : 'Nee') + '</div>'));  
        setTimeout(function(){
          $('#conversation').append($('<div id="current_player"></div>'));
          $('#conversation').stop().animate({
            scrollTop: $('#conversation')[0].scrollHeight
          }, 80);

          player_turn();
        }, 750);
      })
    }, 750);
  }
}

function player_turn() {
  
  // Add attributes to dropdown
  var q = {"ok":true, "attrs":{"opts":[]}};
  if (!window.q.attr) {
    q.attrs.opts.push({"name":"(kies iets)", "dis":true, "sel":true})
    q.ok = false;
  }
  Object.keys(window.attrs).forEach(function(a){
    q.attrs.opts.push({"name":a, "sel":(window.q.attr==a)})
  });

  // Att properties to dropdown
  if (window.attrs[window.q.attr]) {
    q.props = {"opts":[]};
    if (!window.q.prop) {
      q.props.opts.push({"name":"", "sel":true})
    }
    Object.keys(window.attrs[window.q.attr]).forEach(function(p){
      q.props.opts.push({"name":p, "sel":(window.q.prop==p)})
    });
  }

  $('#current_player').replaceWith(template('player_tmpl', q ));

  $('#attr_select').on('change', function(){
    window.q.attr = $('#attr_select').val();
    player_turn();
  });

  $('#conversation #vraag').on('click', function(){
    window.q = {};
    var prop = $('#prop_select').val(), attr = $('#attr_select').val();
    $('#current_player').replaceWith(template('q_tmpl', 
      {'side':'player', 'prop':prop, 'attr':attr}))

    // opponent answers players question
    var ans = false;
    window.face[window.opponent_choice].attrs.forEach(function(a){
      var match = (a.type == attr && (!prop || a.props.some(function(p){ return p==prop })))
      if (match) { ans = true}
    });
    // show filtered faces
    Object.keys(window.face).forEach(function(i){
      var face_match = false;
      window.face[i].attrs.forEach(function(a){
        var match = (a.type == attr && (!prop || a.props.some(function(p){ return p==prop })))
        if (match) { face_match = true }
      }) 
      if (face_match != ans) {
        $('[data-i="'+i+'"] > .my-tick').css('visibility','visible');
      }
    })
    setTimeout(function(){
      $('#conversation').append($('<div class="opponent">' + (ans? 'Ja' : 'Nee') + '</div>'));
      $('#conversation').stop().animate({
        scrollTop: $('#conversation')[0].scrollHeight
      }, 80);
      opponent_turn();
    }, 750);
  })
}
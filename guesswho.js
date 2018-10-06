/*

# Wie is Het?

First, generate faces from attributes file.
Then, 

*/

const histogram = function(a){ return a.reduce((h, v)=>{h[v]=h[v]+1||1; return h}, {})};
const argmax = function(a){ return Object.keys(a).reduce((x, y)=>(a[x] > a[y] ? x : y))};
const sum = function(a){ return a.reduce((x, y)=>(x + y))};

window.det = {};

window.face = {};
window.face_valid = {};
window.attrs = {};
window.q = {};
window.n = 12;

window.opponent_choice = null;
window.player_choice = null;

window.names = ['Isay','Hona','Remees','Yamil','Yonaro','Isa','Tijn','Zöe','Daniel','Thijs','Jesse','Noa','Bas','Gijs','Jan','Lieke','Julian','Teun','Amber','Tom','Mila','Thijmen','Robin','Tim','Ella','Siem','Noah','Niels','Maud','Anne','Roan','Benjamin','Floris','Guus','Hugo','Sarah','Pepijn','Anna','Faye','Milou','Thomas','Lotte','Owen','Justin','Lucas','Roos','Evelien','Jurre','David','Evi','Tygo','Quinten','Amy','Benthe','Luca','Joshua','Willem','Damiän','Dex'];

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
        window.det[key] = data[key].det;
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
    Object.keys(window.face).forEach(function(i){ 
      window.face[i].i = i;
      window.face[i].name = window.names[Math.floor(Math.random() * window.names.length)];
      window.names.splice(window.names.indexOf( window.face[i].name ), 1);
    })

    console.log('faces', window.face);
    console.log('attrs', window.attrs);

    $('#face_container').append(template('face_grid_tmpl', Object.values(window.face)));


    $('#conversation').append($('<div class="opponent">Kies maar iemand!</div>'));
    $('.face').on('click', function(e){
      window.player_choice =  $(e.target.parentNode).attr('data-i');
      $('.you-tick', $(e.target.parentNode)).css('background', 'green');
      $('.face').off('click');

      $('#conversation').append($('<div id="current_player"></div>'));
      player_turn();
    })
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
    var i = null;
    Object.keys(window.face_valid).forEach(function(j){
      if (window.face_valid[j]) { i=j; }
    });
    $('#conversation').append($('<div class="opponent">Ik win! Het is '+ window.face[i].name +'!</div>'));
    $('#conversation').append($('<div class="opponent"><a href=".">Nog een keer spelen?</a></div>'));

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
        {'side':'opponent', 'prop':prop, 'attr':attr, 'det':window.det[attr]} ));
      $('#conversation').append(template('opponent_tmpl', null ));
      $('#conversation').stop().animate({
        scrollTop: $('#conversation')[0].scrollHeight
      }, 80);
      $('#current_player>input').click(function(e){
        setTimeout(function(){
          // player answers opponents question
          var ans = (e.target.value == 'Ja');

          // Update game board
          // filter out faces without this att
          var liar = false;
          Object.keys(window.face).forEach(function(i){
            var face_match = false;
            window.face[i].attrs.forEach(function(a){
              var match = (a.type == attr && (!prop || a.props.some(function(p){ return p==prop })))
              if (match) { face_match = true }
            }) 
            if (face_match != ans) {
              window.face_valid[i] = false;
              $('[data-i="'+i+'"] > .you-tick').css('background','red');
              if (window.player_choice == i) {
                liar = true;
                $('#current_player').replaceWith($('<div class="opponent">Leugenaar!</div>'));
                $('#conversation').append($('<div class="opponent"><a href=".">Nog een keer spelen?</a></div>'));
                $('[data-i="'+i+'"] > .you-tick').css('background','purple');
              }
            }
          })
          if (!liar) {
            $('#current_player').replaceWith($('<div class="player">' + (ans? 'Ja' : 'Nee') + '</div>'));  
            $('#conversation').append($('<div id="current_player"></div>'));
            $('#conversation').stop().animate({
              scrollTop: $('#conversation')[0].scrollHeight
            }, 80);

            player_turn();
          }
        }, 1000);
      })
    }, 1000);
  }
}

function player_turn() {
  
  // Add attributes to dropdown
  var q = {"ok":true, "attrs":{"opts":[]}, "det":window.det[window.q.attr]};
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

  $('#conversation #raad').on('click', function(){
    $('#current_player').replaceWith($('<div class="player" id="current_player">Is het...</div>'));
    $('html').css('cursor', 'pointer');
    $('.face').on('click', function(e){
      $('html').css('cursor', '');
      $(e.target.parentNode).off('click');
      var guess = $(e.target.parentNode).attr('data-i');
      $('#current_player').replaceWith($('<div class="player">Is het '+window.face[guess].name+'?</div>'));
      $('#conversation').stop().animate({ scrollTop: $('#conversation')[0].scrollHeight }, 80);
      setTimeout(function(){
        if (guess == window.opponent_choice) {
          // you won
          $('#conversation').append($('<div class="opponent">Ja! Jij wint!</div>'));
          $('#conversation').append($('<div class="opponent"><a href=".">Nog een keer spelen?</a></div>'));
        } else {
          // continue game
          $('#conversation').append($('<div class="opponent">Nee, helaas!</div>'));
          opponent_turn();
        }
        $('#conversation').stop().animate({ scrollTop: $('#conversation')[0].scrollHeight }, 80);
      }, 1000);
    })

  });

  $('#conversation #vraag').on('click', function(){
    window.q = {};
    var prop = $('#prop_select').val(), attr = $('#attr_select').val();
    $('#current_player').replaceWith(template('q_tmpl', 
      {'side':'player', 'prop':prop, 'attr':attr}))

    setTimeout(function(){
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
          $('[data-i="'+i+'"] > .my-tick').css('background','rgb(128,128,128,0.5)');
        }
      })
    
      $('#conversation').append($('<div class="opponent">' + (ans? 'Ja' : 'Nee') + '</div>'));
      $('#conversation').stop().animate({ scrollTop: $('#conversation')[0].scrollHeight }, 80);
      opponent_turn();
    }, 1000);
  })
}
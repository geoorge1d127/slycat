function Movie(plot) {
  // a plot has access to the image set for the specific cell of the grid
  this.plot = plot;
  this.movie_ref = this.plot.plot_ref + " .movie";
  this.jq_movie = $(this.movie_ref);
  this.d3_movie = d3.select(this.movie_ref).selectAll("image");
  this.hide();
  this.interval = 1000;
  this.show_interval = 2000; // length of time to show the image
  this.animation_interval = null;
  this.current_image = null;
  // TODO leverage bookmarker here for state of movie
  // start out of range and we increment when we ask for the next image
  this.current_image_index = -1;
}

Movie.prototype.build_movie = function() {
  var self = this;
  // TODO images for "image set"
  // TODO this may just work after LG fixes controls wrt image set??
  this.d3_movie = this.d3_movie.data(this.plot.images).enter().append("image")
                               .attr("width", "200px").attr("height","200px")
                               .attr("xlink:href", function(d){return self.plot.image_url_for_session(d);});
};

Movie.prototype.show = function() {
  this.resize();
};

Movie.prototype.resize = function() {
  $(this.jq_movie).css("width", $(this.plot.plot_ref + " .scatterplot-pane").width());
  $(this.jq_movie).css("height", 375);// TODO $(this.plot.plot_ref + " .scatterplot-pane").height());
};

Movie.prototype.hide = function() {
};

// when the movie is over (reached end of loop), repeat by calling loop again
Movie.prototype.check_for_loop_end = function(transition, callback) {
  var n = 0;
  transition
    .each(function() {++n;})
    .each("end", function() {if(!--n) callback.apply(this, arguments);});
};

Movie.prototype.loop = function() {
  var self = this;
  // TODO maybe no transition here, just hide everything:
  // self.d3_movie.attr(op => 0).transition ....
  // see http://stackoverflow.com/questions/23875661/looping-through-a-set-of-images-using-d3js
  // and see my jsfiddel related to this - http://jsfiddle.net/1270p51q/2/
  self.d3_movie.transition().attr("opacity",0);
  self.d3_movie.transition().attr("opacity",1).delay(function(d,i){return i * self.show_interval;})
               .duration(self.interval)
               .call(self.check_for_loop_end, self.loop);

};

Movie.prototype.play = function() {
  var self = this;
  // TODO get ALL hostnames for the image set - assuming there can be more than one?
  // TODO set the hostname to something ... loop over all hostnames and get session cache for that hostname
  // TODO right now we just look at the first image
  if(!login.logged_into_host_for_file(this.plot.images[0])) {
    this.stop();
    login.show_prompt();
  } else {
    this.build_movie();
    this.show();
    this.loop();
    return true;
  }
};

Movie.prototype.stop = function() {

};

Movie.prototype.step = function() {

};

Movie.prototype.next_image = function() {
  this.increment_current_image_index();
  if(this.plot.images) {
    this.current_image = this.plot.images[this.current_image_index];
  }
  return this.current_image;
};

Movie.prototype.increment_current_image_index = function() {
  // TODO consider direction of play when we get there
  if(this.plot.images && this.current_image_index >= this.plot.images.length) {
    this.current_image_index = 0;
  }
  this.current_image_index = this.current_image_index + 1; 
};

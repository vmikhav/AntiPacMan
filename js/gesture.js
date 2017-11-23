"use strict";

const gestures = {unknown:   0,
                  click:     1,
                  swypeLR:   2,
                  swypeTD:   3,
                  swypeDTD:  4,
                  swypeTDT:  5,
                  swypeTLRD: 6,
};

const gestureColors = ['white', 'white', '#FF0000', '#2DE5E5', '#56A521', '#FFCC33', 'yellow'];

function getDistance(a, b) {
  return (Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2));
}

function getSectionOrient(a, b){
  let dx = a.x - b.x;
  let dy = a.y - b.y;

  let result = {x: 0, y: 0};

  let ratio = Math.abs(dx)/(Math.abs(dx)+Math.abs(dy));

  if (ratio >= 0.75){
    result.x = Math.sign(dx);
  }
  else if (ratio <= 0.2){
    result.y = Math.sign(dy);
  }
  else{
    result.x = Math.sign(dx);
    result.y = Math.sign(dy);
  }
  return result;
}

function cogniteGesture(path){
  let i, j, k, ol, result = 0;
  let orients = [];
  if (path.length == 2){
    if (getDistance(path[0], path[1]) < 100){
      result = gestures.click;
    }
    else{
      orients.push(getSectionOrient(path[0], path[1]));
      if (orients[0].x && !orients[0].y){
        result = gestures.swypeLR;
      }
      else if (!orients[0].x && orients[0].y){
        result = gestures.swypeTD;
      }
    }
  }
  else{
    orients.push(getSectionOrient(path[0], path[1]));
    for (i=2; i<path.length; i++){
      j = getSectionOrient(path[i-1], path[i]);
      k = orients.length - 1;
      if (j.x != orients[k].x || j.y != orients[k].y){
        orients.push(j);
      }
    }

    ol = orients.length;

    if (orients.length == 2 && Math.abs(orients[0].y + orients[1].y) == 2 && Math.abs(orients[0].x + orients[1].x) <= 1){
      result = gestures.swypeTD;
    }
    else if ((orients.length == 2 || orients.length == 3)
      && orients[0].y == -orients[orients.length-1].y 
      && Math.abs(orients.reduce((prev, curr) => prev + curr.x, 0)) >= 1){
        if (orients[0].y == -1){
          result = gestures.swypeDTD;
        }
        else{
          result = gestures.swypeTDT;
        }
    }
    else if (ol == 3 || ol == 4){
      if (Math.abs(orients[0].y + orients[ol - 1].y) == 2 
          && orients[0].x == orients[ol - 1].x 
          && orients[1].x == -orients[0].x 
          && (ol == 3 || orients[2].x == -orients[0].x)){
        result = gestures.swypeTLRD;
      }
    }
    //console.log(orients);
  }

  return result;
}

function Point(evt){
  if ('changedTouches' in evt){
    return {x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY};
  }
  else{
    return {x: evt.x, y: evt.y};
  }
}

let simplifyPath = function( points, tolerance ) {

  // helper classes 
  let Vector = function( x, y ) {
    this.x = x;
    this.y = y;
    
  };
  let Line = function( p1, p2 ) {
    this.p1 = p1;
    this.p2 = p2;
    
    this.distanceToPoint = function( point ) {
      // slope
      let m = ( this.p2.y - this.p1.y ) / ( this.p2.x - this.p1.x ),
        // y offset
        b = this.p1.y - ( m * this.p1.x ),
        d = [];
      // distance to the linear equation
      d.push( Math.abs( point.y - ( m * point.x ) - b ) / Math.sqrt( Math.pow( m, 2 ) + 1 ) );
      // distance to p1
      d.push( Math.sqrt( Math.pow( ( point.x - this.p1.x ), 2 ) + Math.pow( ( point.y - this.p1.y ), 2 ) ) );
      // distance to p2
      d.push( Math.sqrt( Math.pow( ( point.x - this.p2.x ), 2 ) + Math.pow( ( point.y - this.p2.y ), 2 ) ) );
      // return the smallest distance
      return d.sort( function( a, b ) {
        return ( a - b ); //causes an array to be sorted numerically and ascending
      } )[0];
    };
  };
  
  let douglasPeucker = function( points, tolerance ) {
    let i;
    if ( points.length <= 2 ) {
      return [points[0]];
    }
    let returnPoints = [],
      // make line from start to end 
      line = new Line( points[0], points[points.length - 1] ),
      // find the largest distance from intermediate poitns to this line
      maxDistance = 0,
      maxDistanceIndex = 0,
      p;
    for( i = 1; i <= points.length - 2; i++ ) {
      let distance = line.distanceToPoint( points[ i ] );
      if( distance > maxDistance ) {
        maxDistance = distance;
        maxDistanceIndex = i;
      }
    }
    // check if the max distance is greater than our tollerance allows 
    if ( maxDistance >= tolerance ) {
      p = points[maxDistanceIndex];
      line.distanceToPoint( p, true );
      // include this point in the output 
      returnPoints = returnPoints.concat( douglasPeucker( points.slice( 0, maxDistanceIndex + 1 ), tolerance ) );
      // returnPoints.push( points[maxDistanceIndex] );
      returnPoints = returnPoints.concat( douglasPeucker( points.slice( maxDistanceIndex, points.length ), tolerance ) );
    } else {
      // ditching this point
      p = points[maxDistanceIndex];
      line.distanceToPoint( p, true );
      returnPoints = [points[0]];
    }
    return returnPoints;
  };
  let arr = douglasPeucker( points, tolerance );
  // always have to push the very last point on so it doesn't get left off
  arr.push( points[points.length - 1 ] );
  return arr;
};
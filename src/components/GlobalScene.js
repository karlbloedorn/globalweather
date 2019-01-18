import React, { Component } from 'react';
import * as THREE from 'three';
import axios from 'axios';
import drawThreeGeo from '../lib/drawThreeGeo.js';
import _ from 'lodash';
var BufferReader = require('buffer-reader');

var TrackballControls = require('three-trackballcontrols');

class GlobalScene extends Component{

  constructor() {
    super();
    this.state = {
        colorBuckets : [
            { mm: 24, rgb: [0.878431,0.878431,0.878431  ] },
            { mm: 74, rgb: [0.6901,0.6901,0.6901  ] },
            { mm: 124, rgb: [ 0.51764, 0.51764, 0.51764  ] },
            { mm: 224, rgb: [  0.7137, 0.35294, 0.35294 ] },
            { mm: 274, rgb: [ 0.7333,0.6431,0.5176  ] },
            { mm: 374, rgb: [ 1.0, 0.7333, 0.3843  ] },
            { mm: 474, rgb: [ 1.0,1.0, 0.2666 ] },
            { mm: 724, rgb: [0.5137, 1.0, 0.5294 ] },
            { mm: 974, rgb: [0.1411,1.0,0.0235  ] },
            { mm: 1474, rgb: [0.2196,0.7529,0.1686  ] },
            { mm: 2474, rgb: [ 0.0862,0.53333,0.0235 ] },
            { mm: 4974, rgb: [0.0549,0.3686,0.2980  ] },
            { mm: 7474, rgb: [0.9843,0.0,1.0  ] },
            { mm: 10004, rgb: [0.4235,0.0,0.4235  ] },
            { mm: Infinity, rgb: [0.0509,0.44705,1.0] }
        ]
    }
  }

  convertToSphereCoords(coordinates_array, sphere_radius) {
        var lon = coordinates_array[0];
        var lat = coordinates_array[1];

        return {
          x: Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180) * sphere_radius,
          y: Math.cos(lat * Math.PI / 180) * Math.sin(lon * Math.PI / 180) * sphere_radius,
          z: Math.sin(lat * Math.PI / 180) * sphere_radius
        }
  }

  componentDidMount(){

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55,width / height, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setClearColor('#111')
    this.renderer.setSize(width, height)
    this.mount.appendChild(this.renderer.domElement)
    this.planet = new THREE.Object3D();

    this.sphereGeometry = new THREE.SphereGeometry(10, 128, 128);
    this.material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        wireframe: false,
        transparent: false,
    });
    this.sphere= new THREE.Mesh(this.sphereGeometry, this.material);
    this.planet.add(this.sphere);
    this.planet.rotation.x = -(90)*0.01745329251;

    this.camera.position.z = 15;
    this.scene.add(this.planet);
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);

    this.controls.noPan = true;
  	this.controls.minDistance = 11;
  	this.controls.maxDistance = 25;

    var that = this;

    axios.all([
      axios.get('data/ne_50m_geographic_lines.json'),
      axios.get('data/ne_50m_admin_1_states_provinces_lines.json'),
      axios.get('data/ne_50m_admin_0_countries.json'),
      axios.get('data/rainfallannual.out', { responseType: 'arraybuffer', timeout: 20000}),
    ]).then(axios.spread( (geoLines, statesResults, countryResults, rainfallResults) => {

      var boxHeight = 3;
      that.box = new THREE.BoxGeometry( 0.05,0.05,boxHeight );
      that.boxMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00,wireframe: true } );
      that.box.applyMatrix( new THREE.Matrix4().makeTranslation( 0.025, 0.025,boxHeight/2.0+10) );

      var i;
      var j;

      var rainfallReader = new BufferReader(new Buffer(rainfallResults.data));

      var latCount = rainfallReader.nextUInt32BE();
      var latArray = new Array(latCount);
      for(i = 0 ; i < latArray.length;i++){
        latArray[i] = rainfallReader.nextFloatBE()
      }
      var longCount = rainfallReader.nextUInt32BE();
      var longArray = new Array(longCount);
      for(j = 0; j < longArray.length; j++){
        longArray[j] = rainfallReader.nextFloatBE()
      }

      var geometry = new THREE.BufferGeometry();
      var vertices = new Float32Array(latCount*longCount*3*6);
      var colors = new Float32Array(latCount*longCount*3*6);

      var colorBuckets = _.cloneDeep(this.state.colorBuckets);

      var comparisonFunc = function(colorBucket){
         return curMM < colorBucket.mm;
      }

      var cur = 0;
      for(i  = 0 ; i < latArray.length;i++){
        for(j = 0; j < longArray.length; j++){
          var offset = cur*3*6;

          var curMM = rainfallReader.nextFloatBE()
          var matchingRange = _.find(colorBuckets, comparisonFunc);
          var color = matchingRange.rgb;
          var lat = latArray[i];
          var lon = longArray[j];

          var northWest = that.convertToSphereCoords([lon-0.25, lat+0.25], 10.01);
          var northEast = that.convertToSphereCoords([lon+0.25, lat+0.25], 10.01);
          var southEast = that.convertToSphereCoords([lon+0.25, lat-0.25], 10.01);
          var southWest = that.convertToSphereCoords([lon-0.25, lat-0.25], 10.01);
          vertices[offset+0] = southEast.x; vertices[offset+1] = southEast.y; vertices[offset+2] = southEast.z;
          vertices[offset+3] = northEast.x; vertices[offset+4] = northEast.y; vertices[offset+5] = northEast.z;
          vertices[offset+6] = northWest.x; vertices[offset+7] = northWest.y; vertices[offset+8] = northWest.z;
          vertices[offset+9] = northWest.x; vertices[offset+10] = northWest.y; vertices[offset+11] = northWest.z;
          vertices[offset+12] = southWest.x; vertices[offset+13] = southWest.y; vertices[offset+14] = southWest.z;
          vertices[offset+15] = southEast.x; vertices[offset+16] = southEast.y; vertices[offset+17] = southEast.z;
          colors[offset+0] = color[0]; colors[offset+1] = color[1]; colors[offset+2] = color[2];
          colors[offset+3] = color[0]; colors[offset+4] = color[1]; colors[offset+5] = color[2];
          colors[offset+6] = color[0]; colors[offset+7] = color[1]; colors[offset+8] = color[2];
          colors[offset+9] = color[0]; colors[offset+10] = color[1]; colors[offset+11] = color[2];
          colors[offset+12] = color[0]; colors[offset+13] = color[1]; colors[offset+14] = color[2];
          colors[offset+15] = color[0]; colors[offset+16] = color[1]; colors[offset+17] = color[2];

          cur++;
        }
      }

      geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
      geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

      var material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors, wireframe: false} );
      var mesh = new THREE.Mesh( geometry, material );
      that.planet.add(mesh);


      geoLines.data.features = _.filter(geoLines.data.features,function(feature){
        return  feature.properties.name === "Equator";
      });

      drawThreeGeo(THREE,geoLines.data, 10.03, 'sphere', {
           color: 0x000
       }, that.planet);

      drawThreeGeo(THREE,statesResults.data, 10.03, 'sphere', {
                 color: 0x000
             }, that.planet);

      drawThreeGeo(THREE,countryResults.data, 10.03, 'sphere', {
                       color: 0x000
                   }, that.planet);
      that.start();
    }));
  }

  componentWillUnmount(){
      this.stop()
      this.mount.removeChild(this.renderer.domElement)
  }

  start = () => {
      if (!this.frameId) {
        this.frameId = requestAnimationFrame(this.animate)
      }
  }

  stop = () => {
      cancelAnimationFrame(this.frameId)
  }

  animate = () => {
     this.controls.update();
     //this.planet.rotation.z += 0.01;
     this.renderScene();
     this.frameId = window.requestAnimationFrame(this.animate)
   }
  renderScene = () => {
    this.renderer.render(this.scene, this.camera)
  }

  render(){
      return(
        <div>
          <div
            style={{ width: '100vw', height: '100vh' }}
            ref={(mount) => { this.mount = mount }}
          />
          <div style={{
                  position: 'absolute',
                  left: '10px',
                  top: '10px',
                  fontSize: '1.5em'
                }}>
            Average annual precipitation (2001-2013)
          </div>

          <div style={{
                  position: 'absolute',
                  right: '10px',
                  bottom: '10px',
                  fontSize: '0.8em'
                }}>
              Lange, Stefan (2016): EartH2Observe, WFDEI and ERA-Interim data Merged and Bias-corrected for ISIMIP (EWEMBI). GFZ Data Services.
              <a href="http://doi.org/10.5880/pik.2016.004">http://doi.org/10.5880/pik.2016.004</a>
          </div>

          <div style={{
              position: 'absolute',
              left: '10px',
              bottom: '10px',
              fontSize: '1.5em'
          }}>
            {
              this.state.colorBuckets.map(function(colorBucket, i){
                if( colorBucket.mm === Infinity ){
                  return null;
                }
                  return (
                    <div>
                      <div style={{ display: 'inline-block',
                        marginRight: 5,
                        marginLeft: 5,
                        width: 15,
                        height: 15,
                        backgroundColor: 'rgb('+ colorBucket.rgb[0]*255.0 +','+ colorBucket.rgb[1]*255.0  + ','+ colorBucket.rgb[2]*255.0  + ')'
                      }} ></div>

                      {colorBucket.mm} mm
                    </div>
                  )
              }, this)
            }
          </div>
        </div>
      )
  }
}

export default GlobalScene

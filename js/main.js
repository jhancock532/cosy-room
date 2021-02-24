//import Stats from "./Stats.min.js"; 

//Dat.GUI parameters
let params = { 
  movementSpeed: 55,
  sprintSpeedBoost: 50,
  movementDeceleration: 10,
  lightIntensity: 100,
  noCollide: true,
  toggleCollisionMesh: function(){
    PlayerMesh.visible = !PlayerMesh.visible;
  },
  toggleStats: function(){
    if (statsVisible){
      stats.dom.style.display = 'none';
    } else {
      stats.dom.style.display = 'block';
    }
    statsVisible = !statsVisible;
  }
}

//Dat.GUI setup
let gui = new dat.GUI();
//dat.GUI.toggleHide();

let movementFolder = gui.addFolder("Movement");
movementFolder.add(params, "movementSpeed", 0, 100).name("Speed");
movementFolder.add(params, "sprintSpeedBoost", 0, 100).name("Sprint Boost");
movementFolder.add(params, "movementDeceleration", 0, 100).name("Deceleration");
let collisionsFolder = gui.addFolder("Collisions");
collisionsFolder.add(params, "noCollide").name("No Collisions");
collisionsFolder.add(params, "toggleCollisionMesh").name("Toggle Wireframe");
movementFolder.open();
collisionsFolder.open();

gui.add(params, "toggleStats").name("Toggle Stats");

//Stats.js setup
const stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
stats.dom.style.display = 'none';
let statsVisible = false;

//Dom elements setup
const pointerlockInstructionsBlocker = document.getElementById( 'pointerlockInstructionsBlocker' );
const pointerlockInstructionsText = document.getElementById( 'pointerlockInstructionsText' );
const clickToViewOverlay = document.getElementById('clickToViewOverlay');

const exhibitItemOverlay = document.getElementById('exhibitItemOverlay');
const exhibitOverlayTitle = document.getElementById('exhibitOverlayTitle');
const exhibitOverlayDescriptionLink = document.getElementById('exhibitOverlayDescriptionLink');
const exhibitOverlayViewExhibitLink = document.getElementById('exhibitOverlayViewExhibitLink');
const exhibitOverlayReturnToGallery = document.getElementById('exhibitOverlayReturnToGallery');

//Renderer & Camera setup
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

camera.position.z = 10;
camera.position.x = 3;
camera.position.y = 4.5;

camera.rotation.y = 3.0;

let cutscenePlaying = false;

const controls = new THREE.PointerLockControls( camera, renderer.domElement );

let previousCameraQuaternion;
let previousCameraPosition;

function viewExhibit(exhibit) {
  previousCameraPosition = camera.position.clone();
  previousCameraQuaternion = camera.quaternion.clone();

  let exhibitObject = scene.getObjectByName(exhibit.objectName);
  let positionOffset = exhibit['viewingOffset'];

  exhibitOverlayTitle.innerHTML = exhibit['title'];
  exhibitOverlayDescriptionLink.href = exhibit['descriptionURL'];
  exhibitOverlayViewExhibitLink.href = exhibit['exhibitURL'];

  let time = {t: 0};
  cutscenePlaying = true;
  controls.unlock();

  outlineBox.visible = false;
  clickToViewOverlay.style.opacity = "0%";

  new TWEEN.Tween(camera.position)
    .to({
      x: exhibitObject.position.x + positionOffset.x,
      y: exhibitObject.position.y + positionOffset.y,
      z: exhibitObject.position.z + positionOffset.z,
    }, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onComplete(() => { 
      const storedMarkerPosition = new THREE.Vector3(exhibitObject.position.x, exhibitObject.position.y, exhibitObject.position.z);
      const startQuaternion = camera.quaternion.clone();
      camera.lookAt(storedMarkerPosition);
      const endQuaternion = camera.quaternion.clone();
      camera.quaternion.copy(startQuaternion);

      new TWEEN.Tween(time)
      .to({t: 1}, 1000)
      .onUpdate(() => {
          THREE.Quaternion.slerp(startQuaternion, endQuaternion, camera.quaternion, time.t);
      })
      .easing(TWEEN.Easing.Quadratic.InOut).onComplete(() => {
        exhibitItemOverlay.style.opacity = "100%";
      })
      .start();
    }).start();
}

function exitExhibit(){
  let time = {t: 0};
  
  exhibitItemOverlay.style.opacity = "0%";

  const storedMarkerPosition = new THREE.Vector3(previousCameraPosition.x, previousCameraPosition.y, previousCameraPosition.z);
  const startQuaternion = camera.quaternion.clone();
  camera.lookAt(storedMarkerPosition);
  const endQuaternion = camera.quaternion.clone();
  camera.quaternion.copy(startQuaternion);

  new TWEEN.Tween(time)
  .to({t: 1}, 1000)
  .onUpdate(() => {
      THREE.Quaternion.slerp(startQuaternion, endQuaternion, camera.quaternion, time.t);
  })
  .easing(TWEEN.Easing.Quadratic.InOut).onComplete(() => {
    new TWEEN.Tween(camera.position)
    .to({
      x: previousCameraPosition.x,
      y: previousCameraPosition.y,
      z: previousCameraPosition.z,
    }, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onComplete(() => { 
      controls.lock();
      cutscenePlaying = false;
    }).start();

  }).start();

}

pointerlockInstructionsText.addEventListener( 'click', function (e) {
  controls.lock();
  e.preventDefault();
}, false );

controls.addEventListener( 'lock', function (e) {
  if (cutscenePlaying == false){
    pointerlockInstructionsText.style.display = 'none';
    pointerlockInstructionsBlocker.style.display = 'none';
  } else {
    renderer.domElement.style.cursor = "pointer"; 
  }

} );

controls.addEventListener( 'unlock', function () {
  if (cutscenePlaying == false){
    pointerlockInstructionsBlocker.style.display = 'block';
    pointerlockInstructionsText.style.display = '';
  } else {
    renderer.domElement.style.cursor = "none"; 
  }
} );

let raycaster = new THREE.Raycaster();

function onClick( event ) {

  if (controls.isLocked){
    /*
    event.preventDefault();
  
    raycaster.setFromCamera( {x:0, y:0}, camera );
  
    let intersects = raycaster.intersectObjects( scene.children, true );
  
    if ( intersects.length > 0 ) {
      let intersectionObject;

      if (intersects[0].object.parent.name == "SketchUp005" || intersects[0].object.name == "ID3_1"){ //dodge through the transparent projector throw mesh
        if (intersects.length > 1){
          intersectionObject = intersects[1];
        } else {
          return;
        }
      } else {
        intersectionObject = intersects[0];
      }

      exhibits.forEach(exhibit => {
        if (intersectionObject.object.name == exhibit['objectName']){
          viewExhibit(exhibit);
          //Swap for array some = https://stackoverflow.com/questions/2641347/short-circuit-array-foreach-like-calling-break
        }
      });
    }
    */
  }
}

renderer.domElement.addEventListener('click', onClick, false);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let sprinting = false;

const onKeyDown = function ( event ) {
  switch ( event.keyCode ) {
    case 38: // up
    case 87: // w
      moveForward = true;
      break;
    case 37: // left
    case 65: // a
      moveLeft = true;
      break;
    case 40: // down
    case 83: // s
      moveBackward = true;
      break;
    case 39: // right
    case 68: // d
      moveRight = true;
      break;
    case 16: // d
      sprinting = true;
      break;
    /*case 32: // space
      if ( canJump === true ) velocity.y += 350;
      canJump = false;
      break;*/
  }
};

const onKeyUp = function ( event ) {
  switch ( event.keyCode ) {
    case 38: // up
    case 87: // w
      moveForward = false;
      break;
    case 37: // left
    case 65: // a
      moveLeft = false;
      break;
    case 40: // down
    case 83: // s
      moveBackward = false;
      break;
    case 39: // right
    case 68: // d
      moveRight = false;
      break;
    case 16: // d
      sprinting = false;
      break;
  }
};

document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

//Player & Collision Dectection setup
let collidableMeshList = [];
let playerCollisionGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8, 1, true);
let wireMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
let PlayerMesh = new THREE.Mesh(playerCollisionGeometry, wireMaterial);
PlayerMesh.position.set(0, 1.05, -5);
PlayerMesh.visible = false;
scene.add( PlayerMesh );	

let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();


//LIGHTING
const bulbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const bulbLight = new THREE.PointLight(0xffebb3, 2, 40, 1);

const bulbMaterial = new THREE.MeshStandardMaterial( {
  emissive: 0xffebb3,
  emissiveIntensity: 1,
  color: 0x000000
} );

bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMaterial ) );
bulbLight.castShadow = true;
bulbLight.position.set( -13.9, 5.6, 10.9); //1.25 //room roughly 50 m tall
scene.add( bulbLight );

let bulbLight2 = bulbLight.clone();

bulbLight2.position.set( -13.9, 5.6, 9.9); //1.25 //room roughly 50 m tall //-6 8.5 6.25 is chandlier

let bulbLight3 = bulbLight.clone();
bulbLight3.intensity = 1;

bulbLight3.position.set( -13.9, 1.6, 22.9); //1.25 //room roughly 50 m tall //-6 8.5 6.25 is chandlier
scene.add( bulbLight3 );

scene.add( bulbLight2 );


//Highlighting Interactive Objects
/*
let selectedBox = new THREE.Box3();

let outlineBox = new THREE.BoxHelper();
outlineBox.material.depthTest = false;
outlineBox.material.transparent = true;
outlineBox.material.color.set('#ff0000'); // Customize the color for outline.
outlineBox.visible = false; // Hidden outline.
scene.add( outlineBox );

function highlightInteractiveObjects(){
  if (cutscenePlaying == false){
    raycaster.setFromCamera( {x:0, y:0}, camera );
    let intersects = raycaster.intersectObjects( scene.children, true );
    
    if ( intersects.length > 0 ) {
      let intersectionObject;

      if (intersects[0].object.parent.name == "SketchUp005" || intersects[0].object.name == "ID3_1"){ //dodge through the transparent projector throw mesh
        if (intersects.length > 1){
          intersectionObject = intersects[1];
        } else {
          return;
        }
      } else {
        intersectionObject = intersects[0];
      }
      
      exhibits.forEach(exhibit => {
        if (intersectionObject.object.name == exhibit['objectName']){
          let exhibitObject = scene.getObjectByName(exhibit.objectName);
        
          selectedBox.setFromObject(exhibitObject);
          if (selectedBox.isEmpty() === false) {
            clickToViewOverlay.style.opacity = "100%";
            outlineBox.setFromObject(exhibitObject);
            outlineBox.visible = true;
          }
        } else {
          outlineBox.visible = false;
          clickToViewOverlay.style.opacity = "0%";
        }
      });

    }
  }
}

*/
//Model Loading
const loader = new THREE.GLTFLoader();

loader.load( '3D/bobweb.glb',
  function ( gltf ) {
    //Thanks //https://stackoverflow.com/questions/49869345/how-to-cast-a-shadow-with-a-gltf-model-in-three-js
    //I will have to traverse the scene recusively if I want realistic shadows...
    gltf.scene.traverse( function( node ) {
      if ( node.isMesh ) { 
        node.castShadow = true; 
        /*if (node.name == "Bitch_With_Miku_Doll"){
          node.material.side = THREE.DoubleSide;
          node.position.set(0, 1, 10);
        }*/
        collidableMeshList.push(node);
      }
    } );
    scene.add( gltf.scene );
    
  }, 
  function ( xhr ) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log( Math.round(percentComplete, 2) + '% downloaded' );
    }
	}, 
  function ( error ) {
	  console.error( error );
  } 
);

//Window Resize handling
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener("resize", onWindowResize);

//Rendering and Animation
function animate() {

  stats.begin();
  
  const time = performance.now();

  if ( controls.isLocked === true) {

    //raycaster.ray.origin.copy( controls.getObject().position );
    //raycaster.ray.origin.y -= 10;

    //const intersections = raycaster.intersectObjects( objects );

    //const onObject = intersections.length > 0;

    const delta = ( time - prevTime ) / 1000;

    velocity.x -= velocity.x * params.movementDeceleration * delta;
    velocity.z -= velocity.z * params.movementDeceleration * delta;
    velocity.y = 0;

    //velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveRight ) - Number( moveLeft );
    direction.normalize(); // this ensures consistent movements in all directions

    let speed = params.movementSpeed;
    if (sprinting){
      speed += params.sprintSpeedBoost;
    }

    if ( moveForward || moveBackward ) velocity.z -= direction.z * speed * delta;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * speed * delta;

    //if ( onObject === true ) {

      //velocity.y = Math.max( 0, velocity.y );
    //  canJump = true;

    //}

    let controlsOriginalPosition = camera.position.clone();
    
    controls.moveRight( -velocity.x * delta );
    controls.moveForward( -velocity.z * delta );

    if (params.noCollide == false){
      PlayerMesh.position.set(controls.getObject().position.x, 1.05, controls.getObject().position.z);
    
      let originPoint = PlayerMesh.position.clone();
      for (let vertexIndex = 0; vertexIndex < PlayerMesh.geometry.vertices.length; vertexIndex++)
      {		
        let localVertex = PlayerMesh.geometry.vertices[vertexIndex].clone();
        let globalVertex = localVertex.applyMatrix4( PlayerMesh.matrix );
        let directionVector = globalVertex.sub( PlayerMesh.position );
        
        let ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
        let collisionResults = ray.intersectObjects( collidableMeshList );
        if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
          camera.position.set(controlsOriginalPosition.x, controlsOriginalPosition.y, controlsOriginalPosition.z);
          break;
        }
      }	
    }

    //controls.getObject().position.y += ( velocity.y * delta ); // new behavior

    //if ( controls.getObject().position.y < 10 ) {

    //  velocity.y = 0;
    //  controls.getObject().position.y = 10;

    //  canJump = true;

    //}
    //highlightInteractiveObjects();
  }

  prevTime = time;

  stats.end();
  requestAnimationFrame( animate );

	render();
}
animate();

function render(){
  //const time = Date.now() * 0.0005;
  //renderer.clear();
  TWEEN.update(performance.now());
  //projectorTexture.update();
  renderer.render( scene, camera );
}

//How to interact with UI - https://discourse.threejs.org/t/clicking-on-gltf-models/10158/4 - DONE
//How to get model objects highlighted - https://discourse.threejs.org/t/ldraw-like-edges/17100




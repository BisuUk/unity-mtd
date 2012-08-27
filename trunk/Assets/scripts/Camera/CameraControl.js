#pragma strict


var orbitTarget : Transform;
var orbitDistance : float;
var orbitSpeeds : Vector2;
var orbitPitchLimits : Vector2;
var zoomSpeed : float;
var panSpeed : float;
var edgeScreenScroll : boolean = true;
var panZoomDamping : float;

private var cameraAimPosition : Vector3;
private var resetPosition : Vector3;
private var resetRotation : Quaternion;
private var resetOrientation : boolean = false;
private var resetOrientStartTime : float;
private var resetOrientDuration : float = 1.0;
private var resetOrientLerp : float = 0.0;
var orbitAngles : Vector2;

function Start()
{
   orbitAngles.x = transform.eulerAngles.y;
   orbitAngles.y = transform.eulerAngles.x;
}

function Rotate(delta : Vector2)
{
   // If we were resetting view, user can override
   resetOrientation = false;
   
   // Orbit camera
   if (orbitTarget)
   {
      orbitAngles.x += delta.x * orbitSpeeds.x * 0.02;
      orbitAngles.y -= delta.y * orbitSpeeds.y * 0.02;
   
      orbitAngles.y = Utility.ClampAngle(orbitAngles.y, orbitPitchLimits.x, orbitPitchLimits.y);

      var rotation = Quaternion.Euler(orbitAngles.y, orbitAngles.x, 0);
      var position = rotation * Vector3(0.0, 0.0, -orbitDistance) + orbitTarget.position;
   
      transform.rotation = rotation;
      transform.position = position;
   }
}

function Pan(delta : Vector2)
{
   resetOrientation = false;
   var adjustPanSpeed : float = panSpeed * (transform.position.y * panZoomDamping);
   transform.position = AdjustNewPosition(transform.position + (transform.right*(-delta.x)*adjustPanSpeed) + (transform.up*(-delta.y)*adjustPanSpeed), 10.0);
}

function Zoom(delta : float)
{
   resetOrientation = true;
   resetOrientStartTime = Time.time-resetOrientDuration/3.0;
   resetRotation = transform.rotation;
   resetPosition = AdjustNewPosition(transform.position + transform.forward*(delta*zoomSpeed), 0.0);
}


function LateUpdate()
{
/*
   // Arrow Keys
   if (Input.GetKey (KeyCode.RightArrow))
      panAmount.x = adjustPanSpeed * Time.deltaTime * 10;
   else if (Input.GetKey (KeyCode.LeftArrow))
      panAmount.x = -adjustPanSpeed * Time.deltaTime * 10;

   if (Input.GetKey (KeyCode.UpArrow))
      panAmount.y = adjustPanSpeed * Time.deltaTime * 10;
   else if (Input.GetKey (KeyCode.DownArrow))
      panAmount.y = -adjustPanSpeed * Time.deltaTime * 10;

   if (edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < 10)
         panAmount.x = -adjustPanSpeed;
      else if (Input.mousePosition.x > Screen.width-10)
         panAmount.x = adjustPanSpeed;

      if (Input.mousePosition.y < 10)
         panAmount.y = -adjustPanSpeed;
      else if (Input.mousePosition.y > Screen.height-10)
         panAmount.y = adjustPanSpeed;
   }
*/

   if (resetOrientation)
   {
      resetOrientLerp = (Time.time-resetOrientStartTime)/resetOrientDuration;
      transform.rotation = Quaternion.Slerp(transform.rotation, resetRotation, resetOrientLerp);
      transform.position = Vector3.Lerp(transform.position, resetPosition, resetOrientLerp);

      orbitAngles.x = transform.eulerAngles.y;
      orbitAngles.y = transform.eulerAngles.x;

      // Reach destination position
      if (transform.rotation == resetRotation && transform.position == resetPosition)
         resetOrientation = false;
   }
}

function AdjustNewPosition(newPos : Vector3, rayExtension: float) : Vector3
{
   var retPos : Vector3 = newPos;
   var travelVec : Vector3;
   var hit : RaycastHit;
   var mask : int = (1 << 10) | (1 << 4); // terrain & water

   travelVec = (newPos-transform.position);
   if (Physics.Raycast(transform.position, travelVec.normalized, hit, travelVec.magnitude+rayExtension, mask))
      retPos = hit.point+travelVec.normalized*-10.0;
   return retPos;
}

function snapToTopDownView()
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;
   resetPosition = Game.map.topDownCameraPos.position;
   resetRotation = Game.map.topDownCameraPos.rotation;
}

function snapToDefaultView(attacker : boolean)
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;
   if (attacker)
   {
      resetPosition = Game.map.attackDefaultCameraPos.position;
      resetRotation = Game.map.attackDefaultCameraPos.rotation;
   }
   else
   {
      resetPosition = Game.map.defendDefaultCameraPos.position;
      resetRotation = Game.map.defendDefaultCameraPos.rotation;
   }
}

function snapToFocusLocation()
{
   var hit : RaycastHit;
   var hitPoint : Vector3;
   var mask : int;
   var ray : Ray;

   resetOrientStartTime = Time.time;
   resetOrientation = true;

   // Draw ray from camera mousepoint to ground plane.
   mask = (1 << 10) | (1 << 4); // terrain & water
   ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      hitPoint = hit.point;
      hitPoint.y += 80.0;
      resetPosition = hitPoint;
      // Get flat forward vector
      var p1 : Vector3 = transform.position;
      p1.y = 0.0;
      var p2 : Vector3 = hitPoint;
      p2.y = 0.0;
      // Don't quite go all the way to the desired point
      // so that when we down angle slightly, our target
      // point is somewhat centered on the screen.
      resetPosition += (p2-p1).normalized * -40.0;
      resetRotation = Quaternion.LookRotation(p2-p1)*Quaternion.Euler(65,0,0);
   }
}

function OnGUI()
{
   var e : Event = Event.current;
   if (e.isMouse)
   {
/*
      // Double click
      if (e.clickCount == 2)
         snapToFocusLocation();
*/
   }
   // Keyboard input
   else if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.R:
         if (!e.shift)
            snapToTopDownView();
         else
            snapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         snapToFocusLocation();
         break;
      }
   }
}
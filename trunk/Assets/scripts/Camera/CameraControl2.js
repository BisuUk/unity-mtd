#pragma strict


var zoomSpeed : float;
var edgeScreenScroll : boolean = true;
var heightLimits : Vector2;
var angleLimits : Vector2;
var fixedSnapOffset : Vector3;
var edgeScrollPixelWidget : int;
var rotateSensitivity : Vector2;
var adjustPanSpeed : float;

private var cameraAimPosition : Vector3;
private var resetPosition : Vector3;
private var resetRotation : Quaternion;
private var resetOrientation : boolean = false;
private var resetOrientStartTime : float;
private var resetOrientDuration : float = 1.0;
private var resetOrientLerp : float = 0.0;
private var zoomedOut : boolean;
private var rotating : boolean;


function Rotate(delta : Vector2)
{
   if (!zoomedOut)
   {
      // If we were resetting view, user can override
      resetOrientation = false;
      rotating = true;

      transform.Rotate(0.0, delta.x*rotateSensitivity.x, 0.0, Space.World);
      transform.Rotate(-delta.y*rotateSensitivity.y, 0.0, 0.0);
   }
}

function Pan(delta : Vector2)
{
   resetOrientation = false;

   var newPos : Vector3 = transform.position;
   newPos += Game.map.bearings.transform.forward*delta.y;
   newPos += Game.map.bearings.transform.right*delta.x;

   //resetPosition = CheckGroundAtPosition(newPos, 100);
   if (zoomedOut)
      transform.position = newPos;
   else
      transform.position = CheckGroundAtPosition(newPos, 100);
}

function Zoom(delta : float)
{
   if (!zoomedOut)
   {
      resetOrientation = true;
      resetOrientStartTime = Time.time-resetOrientDuration/3.0;
   
      var newPos : Vector3 = transform.position;
      newPos.y -= delta*zoomSpeed;
      if (newPos.y > heightLimits.y)
         newPos.y = heightLimits.y;
   
      resetPosition = CheckGroundAtPosition(newPos, heightLimits.x);
   
      var heightIndex = Mathf.InverseLerp(heightLimits.x, heightLimits.y, newPos.y);
      var lookAngle = Mathf.Lerp(angleLimits.x, angleLimits.y, heightIndex);
      var r : Vector3 = transform.localEulerAngles;
      r.x = lookAngle;
      resetRotation = Quaternion.Euler(r);
   }
}

function LateUpdate()
{
   var panAmount : Vector2;
   // Arrow Keys
   if (Input.GetKey (KeyCode.RightArrow))
      panAmount.x = -adjustPanSpeed;
   else if (Input.GetKey (KeyCode.LeftArrow))
      panAmount.x = adjustPanSpeed;

   if (Input.GetKey (KeyCode.UpArrow))
      panAmount.y = -adjustPanSpeed;
   else if (Input.GetKey (KeyCode.DownArrow))
      panAmount.y = adjustPanSpeed;

   if (!rotating && edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < edgeScrollPixelWidget)
         panAmount.x = adjustPanSpeed;
      else if (Input.mousePosition.x > Screen.width-edgeScrollPixelWidget)
         panAmount.x = -adjustPanSpeed;

      if (Input.mousePosition.y < edgeScrollPixelWidget)
         panAmount.y = adjustPanSpeed;
      else if (Input.mousePosition.y > Screen.height-edgeScrollPixelWidget-2)
         panAmount.y = -adjustPanSpeed;
   }

   if (panAmount != Vector2.zero)
      Pan(panAmount);

   if (resetOrientation)
   {
      resetOrientLerp = (Time.time-resetOrientStartTime)/resetOrientDuration;
      transform.rotation = Quaternion.Slerp(transform.rotation, resetRotation, resetOrientLerp);
      transform.position = Vector3.Lerp(transform.position, resetPosition, resetOrientLerp);

      // Reach destination position
      if (transform.rotation == resetRotation && transform.position == resetPosition)
         resetOrientation = false;
   }
}

function AdjustNewPosition(newPos : Vector3, rayExtension: float) : Vector3
{
   // Checks camera collisions with terrain
   var retPos : Vector3 = newPos;
   var travelVec : Vector3;
   var hit : RaycastHit;
   var mask : int = (1 << 10) | (1 << 4); // terrain & water

   travelVec = (newPos-transform.position);
   if (Physics.Raycast(transform.position, travelVec.normalized, hit, travelVec.magnitude+rayExtension, mask))
      retPos = hit.point+travelVec.normalized*-10.0;
   return retPos;
}

function CheckGroundAtPosition(newPos : Vector3, bumpUpFromGround : float) : Vector3
{
   // Checks camera collisions with terrain
   var retPos : Vector3 = newPos;
   var hit : RaycastHit;
   var mask : int = (1 << 10) | (1 << 4); // terrain & water

   var skyPoint : Vector3 = newPos;
   skyPoint.y = 25000;
   if (Physics.Raycast(skyPoint, Vector3.down, hit, Mathf.Infinity, mask))
   {
      // 5.0 is just a little pad, sometimes camera can see under steep hills
      var hpY : float = hit.point.y+5.0;

      if (hpY >= newPos.y)
      {
         var bumpUpPos : Vector3 = hit.point;
         bumpUpPos.y += bumpUpFromGround;
         return bumpUpPos;
      }
      else if (newPos.y > heightLimits.y)
         retPos.y = heightLimits.y;
   }
   else if (newPos.y > heightLimits.y)
      retPos.y = heightLimits.y;

   return retPos;
}

function SnapToTopDownView()
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;
   resetPosition = Game.map.topDownCameraPos.position;
   resetRotation = Game.map.topDownCameraPos.rotation;
   zoomedOut = true;
}

function SnapToDefaultView(attacker : boolean)
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
   zoomedOut = false;
}

function SnapToFocusLocation()
{
   var hit : RaycastHit;
   var mask : int;
   var ray : Ray;

   // Draw ray from camera mousepoint to ground plane.
   mask = (1 << 10) | (1 << 4); // terrain & water
   ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      SnapToLocation(hit.point);
   }
}

function SnapToLocation(location : Vector3)
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;

   location = location + fixedSnapOffset;
   location.y = heightLimits.y;
   resetPosition = CheckGroundAtPosition(location, 100);

/*
   // FOR FREE CAMERA
   // Get flat forward vector
   var p1 : Vector3 = transform.position;
   p1.y = 0.0;
   var p2 : Vector3 = location;
   p2.y = 0.0;
   // Don't quite go all the way to the desired point
   // so that when we down angle slightly, our target
   // point is somewhat centered on the screen.
   resetPosition += (p2-p1).normalized * -80.0;
   resetRotation = Quaternion.LookRotation(p2-p1)*Quaternion.Euler(35,0,0);
*/
   resetRotation = Game.map.attackDefaultCameraPos.rotation;
   zoomedOut = false;
}

function Reorient()
{
   resetPosition = transform.position;

   var heightIndex = Mathf.InverseLerp(heightLimits.x, heightLimits.y, transform.position.y);
   var lookAngle = Mathf.Lerp(angleLimits.x, angleLimits.y, heightIndex);
   var r : Vector3;// = transform.localEulerAngles;
   r.x = lookAngle;
   r.y = Game.map.attackDefaultCameraPos.rotation.eulerAngles.y;
   r.z = Game.map.attackDefaultCameraPos.rotation.eulerAngles.z;

   resetRotation = Quaternion.Euler(r);


   resetOrientStartTime = Time.time;
   resetOrientation = true;
   rotating = false;
}
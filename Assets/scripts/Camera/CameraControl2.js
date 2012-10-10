#pragma strict


var zoomSpeed : float;
var edgeScreenScroll : boolean = true;
var heightLimits : Vector2;
var angleLimits : Vector2;
var fixedSnapOffset : Vector3;
var edgeScrollPixelWidget : int;
var rotateSensitivity : Vector2;
var adjustPanSpeed : float;
var isZoomedOut : boolean;

private var cameraAimPosition : Vector3;
private var resetPosition : Vector3;
private var resetRotation : Quaternion;
private var resetOrientation : boolean = false;
private var resetOrientStartTime : float;
private var resetOrientDuration : float = 1.0;
private var resetOrientLerp : float = 0.0;
private var canInputInterruptReset : boolean;
private var isRotating : boolean;


function CanControl() : boolean
{
   if (resetOrientation)
      return canInputInterruptReset;
   return true;
}

function Rotate(delta : Vector2)
{
   if (CanControl() && !isZoomedOut)
   {
      // If we were resetting view, user can override
      resetOrientation = false;
      isRotating = true;
      //Screen.lockCursor = true;

      transform.Rotate(0.0, delta.x*rotateSensitivity.x, 0.0, Space.World);
      transform.Rotate(-delta.y*rotateSensitivity.y, 0.0, 0.0);
   }
}

function Pan(delta : Vector2)
{
   if (CanControl())
   {
   resetOrientation = false;

   var newPos : Vector3 = transform.position;

   var flatForwardVec : Vector3 = transform.forward;
   flatForwardVec.y = 0;
   flatForwardVec.Normalize();

   var flatRightVec : Vector3 = transform.right;
   flatRightVec.y = 0;
   flatRightVec.Normalize();

   newPos -= flatForwardVec*delta.y;
   newPos -= flatRightVec*delta.x;

   if (newPos.x < Game.map.boundaries.x)
      newPos.x = Game.map.boundaries.x;
   else if (newPos.x > Game.map.boundaries.w)
      newPos.x = Game.map.boundaries.w;

   if (newPos.z < Game.map.boundaries.y)
      newPos.z = Game.map.boundaries.y;
   else if (newPos.z > Game.map.boundaries.z)
      newPos.z = Game.map.boundaries.z;

   //resetPosition = CheckGroundAtPosition(newPos, 100);
   if (isZoomedOut)
      transform.position = newPos;
   else
      transform.position = CheckGroundAtPosition(newPos, 100);
   }
}

function Zoom(delta : float)
{
   if (!isZoomedOut)
   {
      if (CanControl())
      {
         resetOrientation = true;
         canInputInterruptReset = true;
         resetOrientStartTime = Time.time-resetOrientDuration/3.0;
      
         var newPos : Vector3 = transform.position;
         newPos.y -= delta*zoomSpeed;
         if (newPos.y > heightLimits.y)
            newPos.y = heightLimits.y;
      
         resetPosition = CheckGroundAtPosition(newPos, heightLimits.x);
   
         if (resetPosition.y >= heightLimits.y)
         {
            SnapToTopDownView();
         }
         else
         {
            var heightIndex = Mathf.InverseLerp(heightLimits.x, heightLimits.y, newPos.y);
            var lookAngle = Mathf.Lerp(angleLimits.x, angleLimits.y, heightIndex);
            var r : Vector3 = transform.localEulerAngles;
            r.x = lookAngle;
            resetRotation = Quaternion.Euler(r);
         }
      }
   }
   else
   {
      if (delta > 0)
         SnapToFocusMouseLocation();
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

   if (!isRotating && edgeScreenScroll)
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
   isZoomedOut = true;
}

function SnapToDefaultView(attacker : boolean)
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;
   SnapToLocation(((attacker) ? Game.map.attackDefaultCameraPos.position : Game.map.defendDefaultCameraPos.position), false);
   isZoomedOut = false;
}

function SnapToFocusMouseLocation()
{
   var hit : RaycastHit;
   var mask : int;
   var ray : Ray;

   // Draw ray from camera mousepoint to ground plane.
   mask = (1 << 10) | (1 << 4); // terrain & water
   ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      SnapToFocusLocation(hit.point, false);
   }
}

function SnapToLocation(location : Vector3, interruptable : boolean)
{
   resetOrientStartTime = Time.time;
   resetOrientation = true;
   resetPosition = CheckGroundAtPosition(location, 100);
   canInputInterruptReset = interruptable;
   resetRotation = Game.map.attackDefaultCameraPos.rotation;
   isZoomedOut = false;
}

function SnapToFocusLocation(location : Vector3, interruptable : boolean)
{
   var newLoc = location + fixedSnapOffset;
   newLoc.y = fixedSnapOffset.y;
   SnapToLocation(newLoc, interruptable);
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
   isRotating = false;
   //Screen.lockCursor = false;
}

function SetRotating(newIsRotating : boolean)
{
   isRotating = newIsRotating;
}
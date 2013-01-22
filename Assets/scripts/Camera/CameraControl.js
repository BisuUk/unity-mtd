#pragma strict

var zoomSpeed : float;
var edgeScreenScroll : boolean = true;
var edgeScreenPixelWidth : int;
var edgePanSpeed : float = 1.0;
var rotateSensitivity : Vector2;
var panSpeed : float = 0.2;
var orbitTarget : Transform;
var orbitDistance = 100.0;
var orbitYLimit : Vector2 = Vector2(-20.0f, 80.0f);
var isZoomedOut : boolean;

private var resetPosition : Vector3;
private var resetRotation : Quaternion;
private var resetStartTime : float;
private var resetDuration : float = 1.0;
private var resetLerp : float = 0.0;
private var focusOffset : Vector3;
private var orbitAngles : Vector2;
private var orbitPosition : Vector3;
private var lerping : boolean;


function Start()
{
   var hit : RaycastHit;
   var mask = (1 << 10); // terrain
   if (Physics.Raycast(Game.map.attackDefaultCameraPos.position, Game.map.attackDefaultCameraPos.forward, hit, Mathf.Infinity, mask))
      focusOffset = (Game.map.attackDefaultCameraPos.position - hit.point);

   orbitTarget = null;
   lerping = false;
   var angles : Vector3= transform.eulerAngles;
   orbitAngles.x = angles.y;
   orbitAngles.y = angles.x;
   orbitPosition = Game.map.startCameraLookAt.position;
//   orbitPosition = CheckBoundaries(orbitPosition);
   UpdatePosRot(false);
   lerping = false;
}

function UpdatePosRot(lerp : boolean)
{
   var rot : Quaternion = Quaternion.Euler(orbitAngles.y, orbitAngles.x, 0);
   var v : Vector3 = new Vector3(0.0f, 0.0f, -orbitDistance);
   var pos : Vector3 = orbitPosition + (rot * v);

   if (lerp && lerping == false)
   {
      StartCoroutine(MotionLerp(pos, rot));
   }
   else
   {
      transform.rotation = rot;

      pos = CheckBoundaries(pos);
      pos = Utility.GetGroundAtPosition(pos, 1.0);

      transform.position = pos;
   }
}

private function CheckBoundaries(newPos : Vector3) : Vector3
{
   if (Game.map.boundaryLower && Game.map.boundaryLower.position != Vector3.zero
      && Game.map.boundaryUpper && Game.map.boundaryUpper.position != Vector3.zero)
   {
      var corrected : Vector3;
      corrected.x = Mathf.Clamp(newPos.x, Game.map.boundaryLower.position.x, Game.map.boundaryUpper.position.x);
      corrected.y = Mathf.Clamp(newPos.y, Game.map.boundaryLower.position.y, Game.map.boundaryUpper.position.y);
      corrected.z = Mathf.Clamp(newPos.z, Game.map.boundaryLower.position.z, Game.map.boundaryUpper.position.z);
   }
   else
   {
      corrected = newPos;
   }

/*
   // Circle
   // hit boundary
   var flatNewPos : Vector3 = new Vector3(newPos.x, 0, newPos.z);
   var flatMapCenter : Vector3 = new Vector3(Game.map.center.position.x, 0, Game.map.center.position.z);
   var vectFromMapCenter = flatNewPos - flatMapCenter;
   if (vectFromMapCenter.magnitude > Game.map.boundaryRadius)
      corrected = flatMapCenter + (vectFromMapCenter.normalized * Game.map.boundaryRadius);

   // hit ceiling or floor boundary
   if (newPos.y < Game.map.boundaryHeights.x)
      corrected.y = Game.map.boundaryHeights.x;
   else if (newPos.y > Game.map.boundaryHeights.y)
      corrected.y = Game.map.boundaryHeights.y;
   else
      corrected.y = newPos.y;
*/
   return corrected;
}


function MotionLerp(posLerpTo : Vector3 , rotLerpTo : Quaternion)
{
   lerping = true;
   var lerpStartTime : float = Time.time;
   var lerpEndTime : float = Time.time + 0.2f;
   var posLerpFrom : Vector3 = transform.position;
   var rotLerpFrom : Quaternion = transform.rotation;

   while (Time.time <= lerpEndTime)
   {
      var lerpValue : float = Mathf.InverseLerp(lerpStartTime, lerpEndTime, Time.time);
      transform.position = Vector3.Lerp(posLerpFrom, posLerpTo, lerpValue);
      transform.rotation = Quaternion.Slerp(rotLerpFrom, rotLerpTo, lerpValue);
      yield;
   }
   lerping = false;
}

function Rotate(delta : Vector2)
{
   orbitAngles.x += delta.x * rotateSensitivity.x;
   orbitAngles.y -= delta.y * rotateSensitivity.y;
   orbitAngles.y = ClampAngle(orbitAngles.y, orbitYLimit.x, orbitYLimit.y);
   UpdatePosRot(false);
}

function Pan(delta : Vector2)
{
   //Vector3 newPos = transform.position;
   var newPos : Vector3  = orbitPosition;

   var flatForwardVec : Vector3 = transform.forward;
   flatForwardVec.y = 0;
   flatForwardVec.Normalize();

   var flatRightVec : Vector3 = transform.right;
   flatRightVec.y = 0;
   flatRightVec.Normalize();

   newPos -= flatForwardVec*delta.y*panSpeed*Time.fixedDeltaTime;
   newPos -= flatRightVec*delta.x*panSpeed*Time.fixedDeltaTime;

   newPos = CheckBoundaries(newPos);
   //newPos = Utility.GetGroundAtPosition(newPos, 1.0);

   //transform.position = newPos;
   orbitPosition = newPos;
   orbitTarget = null;
   UpdatePosRot(false);
}

function PanOrtho(delta : Vector2)
{
   var newPos : Vector3  = orbitPosition;

   newPos -= (transform.right * delta.x * panSpeed);
   newPos -= (transform.up * delta.y * panSpeed);

   newPos = CheckBoundaries(newPos);
   //newPos = Utility.GetGroundAtPosition(newPos, 1.0);

   orbitPosition  = newPos;

   orbitTarget = null;
   UpdatePosRot(false);
}

function Zoom(delta : float)
{
   //Debug.Log("ZOOM:"+delta);
   orbitDistance -= delta * zoomSpeed;
   UpdatePosRot(false);
}

function LateUpdate()
{
   if (orbitTarget && lerping == false)
   {
      orbitPosition = orbitTarget.position;
      UpdatePosRot(false);
   }

   var panAmount : Vector2 = Vector2(0.0f, 0.0f);
   // Arrow Keys
   if (Input.GetKey (KeyCode.RightArrow))
      panAmount.x = -panSpeed;
   else if (Input.GetKey (KeyCode.LeftArrow))
      panAmount.x = panSpeed;

   if (Input.GetKey (KeyCode.UpArrow))
      panAmount.y = -panSpeed;
   else if (Input.GetKey (KeyCode.DownArrow))
      panAmount.y = panSpeed;

   if (edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < edgeScreenPixelWidth)
         panAmount.x = edgePanSpeed;
      else if (Input.mousePosition.x > Screen.width-edgeScreenPixelWidth)
         panAmount.x = -edgePanSpeed;

      if (Input.mousePosition.y < edgeScreenPixelWidth)
         panAmount.y = edgePanSpeed;
      else if (Input.mousePosition.y > Screen.height-edgeScreenPixelWidth-2)
         panAmount.y = -edgePanSpeed;
   }

   if (panAmount != Vector2.zero)
      Pan(panAmount);
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


function SnapToTopDownView()
{
   resetStartTime = Time.realtimeSinceStartup;
   resetPosition = Game.map.topDownCameraPos.position;
   resetRotation = Game.map.topDownCameraPos.rotation;
   isZoomedOut = true;
}

function SnapToDefaultView(attacker : boolean)
{
   resetStartTime = Time.realtimeSinceStartup;
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

function SnapTo(position : Vector3)
{
   orbitPosition = position;
   orbitPosition = CheckBoundaries(orbitPosition);
   UpdatePosRot(true);
}

function SnapToLocation(location : Vector3, interruptable : boolean)
{
   resetStartTime = Time.realtimeSinceStartup;
   resetPosition = Utility.GetGroundAtPosition(location, 100);
   resetRotation = Game.map.attackDefaultCameraPos.rotation;
   isZoomedOut = false;
}

function SnapToFocusLocation(location : Vector3, interruptable : boolean)
{
   var newLoc = location+focusOffset;
   SnapToLocation(newLoc, interruptable);
}

function SetOrbitTarget(t : Transform)
{
   if (orbitTarget && orbitTarget == t)
   {
      orbitDistance = 30.0f;
      orbitPosition = orbitTarget.position;
   }
   else
   {
      orbitTarget = t;
      orbitPosition = orbitTarget.position;
      orbitDistance = (transform.position - t.position).magnitude;
   }
   UpdatePosRot(true);
}

static function ClampAngle (angle : float, min : float, max : float)
{
   if (angle < -360)
      angle += 360;
   else if (angle > 360)
      angle -= 360;
   return Mathf.Clamp(angle, min, max);
}
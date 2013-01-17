#pragma strict
#pragma downcast

var controller : CharacterController;
var color : Color;
var walkSpeed : float;
var speedCap : float;
var model : GameObject;

@HideInInspector var isStickied : boolean;

private var actualSpeed : float;
private var externalForce : Vector3;
private var nextWaypoint : int;
private var path : List.<Vector3>;
private var walkDir : Vector3;

private var isJumping : boolean;
@HideInInspector var jumpDieOnImpact : boolean;
private var jumpArcHeight : float;
private var jumpStartPos : Vector3;
private var jumpEndPos : Vector3;
private var jumpStartTime : float;
private var jumpEndTime : float;
private var jumpLastVelocity : Vector3;
private var jumpPrevVelocity : Vector3;
private var gravityVector : Vector3;


class UnitBuff
{
   var action : ActionType;
   var duration : float;
   var magnitude : float;
   var vector : Vector3;
   var color : Color;
};

//-----------
// UNIT
//-----------
function Awake()
{
   color = Color.white;
   actualSpeed = walkSpeed;
   externalForce = Vector3.zero;
   UpdateWalkAnimationSpeed();
   StartCoroutine("CheckStuck");
   isStickied = false;
   isJumping = false;
}

function FixedUpdate()
{
   DoMotion();
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressUnit", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseEnter()
{
   UIControl.CurrentUI().SendMessage("OnMouseEnterUnit", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseExit()
{
   UIControl.CurrentUI().SendMessage("OnMouseExitUnit", this, SendMessageOptions.DontRequireReceiver);
}

function WaitForOnTriggerToKill()
{
   //yield new WaitForEndOfFrame();
   // Wait for next frame
   yield;
   // Hopefully OnTrigger has been called by here, and
   // if the unit hasn't been stickied he should die now.
   if (isStickied == false)
      Splat();
}

function OnControllerColliderHit(hit : ControllerColliderHit)
{
   if (hit.collider.gameObject.layer == 10)
   {
      if (controller.isGrounded == false)
      {
         Debug.Log("Landed vel="+controller.velocity+" cv="+controller.velocity.magnitude+" s="+isStickied);
         // Landed from being airborne
         isJumping = false;
         if (controller.velocity.magnitude >= 20.0)
         {
            // The splatter OnTriggerEnter() fires AFTER this function, meaning that
            // if a splatter would save the unit from dying on impact, we need to
            // wait a frame so OnTriggerEnter can fire on the splatter.
            StartCoroutine(WaitForOnTriggerToKill());
         }
         else
            model.animation.Play("walk");
      }
   }
}

function DoMotion()
{
   var movementVector : Vector3 = Vector3.zero;
   if (isJumping)
   {
      if (Time.time >= jumpEndTime)
      {
         // Keep falling along last vector till we land
         //controller.Move(jumpLastVelocity);
         isJumping = false;
         gravityVector.y = controller.velocity.y;
      }
      else
      {
         // Do jump sin wave
         var cTime : float = Mathf.InverseLerp(jumpStartTime, jumpEndTime, Time.time);
         var newPos : Vector3  = Vector3.Lerp(jumpStartPos, jumpEndPos, cTime);
         newPos.y += jumpArcHeight * Mathf.Sin(Mathf.Clamp01(cTime) * Mathf.PI);
         movementVector = newPos-transform.position;
         controller.Move(movementVector);
         jumpLastVelocity = movementVector;
      }
   }
   else if (isStickied)
   {
   }
   else
   {
      // Move along flat vector at speed
      movementVector = (walkDir * actualSpeed) + externalForce;
      //Debug.Log("actualSpeed="+actualSpeed+" walkdir="+walkDir+ "m="+movementVector);

      // Increase gravity vector
      gravityVector = (controller.isGrounded && isStickied == false &&  isJumping == false) ? Physics.gravity : (gravityVector + Physics.gravity);

      // Apply gravity and time slicing
      movementVector += gravityVector;
      movementVector *= Time.deltaTime;
      controller.Move(movementVector);

      // Face movement
      transform.rotation = Quaternion.LookRotation(walkDir);
   }
/*
   else
   {
      var waypoint : Vector3;
      var wayGroundPos : Vector3;
      var groundPos : Vector3;
      var flatForwardVec : Vector3;
      var distToWay : float;
   
      // Check if we're at the end of our current path
      if (nextWaypoint > (path.Count-1))
         ReversePath();
   
      // Move toward next waypoint
      // get next way
      waypoint = path[nextWaypoint];
      //transform.LookAt(waypoint);
      //transform.Translate(transform.forward * actualSpeed * Time.deltaTime, Space.World);
      wayGroundPos = waypoint;
      wayGroundPos.y = 0.0;
      groundPos = transform.position;
      groundPos.y = 0.0;
      flatForwardVec = wayGroundPos - groundPos;
      distToWay = flatForwardVec.magnitude;

      //Debug.Log("vel:"+controller.velocity+" vm:"+controller.velocity.magnitude);

      // If we've captured a waypoint, pop queue for next waypoint
      if (distToWay <= 0.25)
      {
         nextWaypoint += 1;
         return;
      }

      // Move along flat vector at speed
      movementVector = (flatForwardVec.normalized * actualSpeed) + externalForce;

      // Apply gravity and time slicing
      movementVector.y += Physics.gravity.y;
      movementVector *= Time.deltaTime;
      controller.Move(movementVector);

      // Face movement
      transform.rotation = Quaternion.LookRotation(flatForwardVec);
      //Debug.Log("rotation:"+transform.rotation.eulerAngles);
   }
*/
}

function CheckStuck()
{
   var blockResolutionSeconds : float = 3.0;
   var blockedTimerExpire : float = Time.time + blockResolutionSeconds;
   var lastPosition : Vector3 = transform.position;
   while (true)
   {
      //Debug.Log("isStickied="+isStickied+" isJumping="+isJumping);
      if (isStickied == false && isJumping == false)
      {
         var diff : float = (lastPosition - transform.position).magnitude;
         //Debug.Log("Diff="+diff);
         if (diff > 0.25)
         {
            lastPosition = transform.position;
            blockedTimerExpire = Time.time + blockResolutionSeconds;
         }
         else if (Time.time > blockedTimerExpire)
         {
            Debug.Log("Unit splatted due to no progress.");
            Splat();
         }
      }
      yield;
   }
}

function SetDirection(direction : Vector3)
{
   var flatVec : Vector3 = direction;
   flatVec.y = 0.0;
   flatVec.Normalize();

   var q : Quaternion = new Quaternion();
   q.SetLookRotation(flatVec);
   SetDirection(q.eulerAngles.y);
}

function SetDirection(dir : float)
{
   //var newRotation : Vector3 = transform.rotation.eulerAngles;
   //newRotation.y = dir
   transform.rotation.eulerAngles.y = dir;
   walkDir = transform.forward;
}

function ReverseDirection()
{
   walkDir = transform.forward * -1.0;
}


function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);

   if (path.Count > 0)
   {
      nextWaypoint = 0;

      walkDir = path[1] - path[0];
      walkDir.y = 0.0;
      walkDir.Normalize();
      //Debug.Log("SETPATH:"+path[1]+" : "+path[0]);
   }
}

function ReversePath()
{
   var newNextWaypoint = path.Count - nextWaypoint;
   path.Reverse();
   nextWaypoint = newNextWaypoint;
}

function ApplyBuff(buff : UnitBuff)
{
   StartCoroutine(BuffCoroutine(buff));
}

private function BuffCoroutine(buff : UnitBuff)
{
   switch (buff.action)
   {
      case ActionType.ACTION_SPEED_CHANGE:
         actualSpeed += buff.magnitude;
         if (actualSpeed > speedCap)
            actualSpeed = speedCap;
         // Sets animation play speed based on actual speed
         UpdateWalkAnimationSpeed();
         break;
   }

   yield WaitForSeconds(buff.duration);

   switch (buff.action)
   {
      case ActionType.ACTION_SPEED_CHANGE:
         actualSpeed -= buff.magnitude;
         if (actualSpeed < walkSpeed)
            actualSpeed = walkSpeed;
         // Sets animation play speed based on actual speed
         UpdateWalkAnimationSpeed();
         break;
   }
}

function Jump(arcHeight : float, timeToImpact : float)
{
   //Jump((isJumping) ? (transform.position+jumpPrevVelocity) : (transform.position+controller.velocity), arcHeight, timeToImpact);
   Jump((transform.position+(walkDir*actualSpeed)), arcHeight, timeToImpact);
}

function Jump(to : Vector3, arcHeight : float, timeToImpact : float)
{
//Debug.Log("JUMP");
   jumpArcHeight = arcHeight;
   jumpStartTime = Time.time;
   jumpEndTime = jumpStartTime + timeToImpact;
   jumpStartPos = transform.position;
   jumpEndPos = to;
   if (!isJumping)
      jumpPrevVelocity = controller.velocity;
   isJumping = true;
   model.animation.Stop();
}

function SetStickied(stickied : boolean)
{
   isStickied = stickied;
   if (isStickied)
   {
      gravityVector = Physics.gravity;
      model.animation.Stop();
      isJumping = false; // save
   }
   else
      model.animation.Play("walk");
}

function SetColor(c : Color)
{
   SetColor(c.r, c.g, c.b);
}

@RPC
function SetColor(r : float, g : float, b : float)
{
   color = Color(r,g,b);
   SetChildrenColor(transform, color);
  
   //if (Network.isServer)
   //   netView.RPC("SetColor", RPCMode.Others, r, g, b);
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer)
   {
      t.renderer.material.color = newColor;
      t.renderer.material.SetColor("_TintColor", newColor);
      t.renderer.material.SetColor("_MainColor", newColor);
   }
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

function SetHovered(hovered : boolean)
{
   SetChildrenHovered(transform, hovered);
}

private function SetChildrenHovered(t : Transform, hovered : boolean)
{
   if (t.renderer)
   {
      t.renderer.material.SetColor("_OutlineColor", (hovered) ? Color.green : Color.black);
      t.renderer.material.SetFloat("_Outline", (hovered) ? 0.007 : 0.001);
   }
   for (var child : Transform in t)
      SetChildrenHovered(child, hovered);
}

function UpdateWalkAnimationSpeed()
{
   if (model && model.animation)
   {
      // Make all animations in this character play at half speed
      for (var state : AnimationState in model.animation)
         state.speed = actualSpeed;
   }
}

function Splat()
{
   var hit : RaycastHit;
   var mask = (1 << 10) | (1 << 4); // terrain & water
   var ray : Ray;
   ray.origin = transform.position;
   //ray.direction = (controller.velocity.magnitude == 0) ? Vector3.down : controller.velocity;
   ray.direction = transform.up * -1.0f;
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      var splat : AbilitySplatter = Instantiate(Game.prefab.Ability(0), hit.point, Quaternion.identity).GetComponent(AbilitySplatter);
      splat.Init(hit, color);
      splat.WashIn(1.0);
   }
   Destroy(gameObject);
}






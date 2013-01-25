#pragma strict
#pragma downcast

var controller : CharacterController;
var color : Color;
var walkSpeed : float;
var speedCap : float;
var model : GameObject;
var slideSpeed : float = 1.0;
@HideInInspector var actualSpeed : float;
@HideInInspector var isStickied : boolean;
@HideInInspector var focusTarget : Transform;

private var externalForce : Vector3;
//private var nextWaypoint : int;
//private var path : List.<Vector3>;
private var walkDir : Vector3;
private var isArcing : boolean;
private var arcHeight : float;
private var arcStartPos : Vector3;
private var arcEndPos : Vector3;
private var arcStartTime : float;
private var arcEndTime : float;
private var gravityVector : Vector3;
private var velocity : Vector3 = Vector3.zero;
private var instantForce : Vector3 = Vector3.zero;
private var slideLimit : float;
private var isGrounded : boolean;
private var preFocusDir : Vector3;

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
   isArcing = false;
   slideLimit = controller.slopeLimit - .1;
   isGrounded = false;
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

function OnControllerColliderHit(hit : ControllerColliderHit)
{
   //Debug.Log("Hit:"+hit.collider.gameObject.name);
   if (hit.collider.gameObject.layer == 10)
   {
      if (isGrounded == false)
      {
         //Debug.Log("Landed vel="+controller.velocity+" cv="+controller.velocity.magnitude+" s="+isStickied);
         // Landed from being airborne
         isArcing = false;

         // Check for blue sticky near landing area, if found, don't die
         //Debug.Log("velocity="+velocity.magnitude);
         if (controller.velocity.magnitude >= 22.0)
         {
            var unitShouldDie : boolean = true;
            var splatters : Collider[] = Physics.OverlapSphere(hit.point, 0.7, (1 << 13));

            if (splatters.Length > 0)
            {
               // Get nearest blue splat
               var splatterList : List.<Collider> = splatters.OrderBy(function(x){return (x.transform.position-transform.position).magnitude;}).ToList();
               for (var c : Collider in splatterList)
               {
                  var splat : AbilitySplatter = c.GetComponent(AbilitySplatter);
                  if (splat && splat.color == Color.blue && splat.capturedUnit == null)
                  {
                     // So we don't still to walls that are facing basically the opposite direction
                     var dotp : float = Vector3.Dot(splat.transform.up, hit.normal);
                     //Debug.Log("dot:"+dotp);
                     if (Mathf.Abs(dotp) > 0.2)
                     {
                        //Debug.Log("SAVED");
                        splat.OnTriggerEnter(controller.collider);
                        unitShouldDie = false;
                        break;
                     }
                  }
               }
            }

            if (unitShouldDie)
               Splat(hit);
         }
         else
         {
            velocity = controller.velocity;
            model.animation.Play("walk");
         }
      }
   }
}

function InstantForce(force : Vector3)
{
   InstantForce(force, false);
}

private var lastIFTime : float;
private var lastIFForce : Vector3;
function InstantForce(force : Vector3, resetGravity : boolean)
{
   // Prevent accidental doubling of forces
   if (Time.time-lastIFTime <= 0.05f && force == lastIFForce)
   {
      Debug.Log("Duplicate force detected, ignoring.");
      return;
   }

   //Debug.Log("InstantForce:"+force);
   if (resetGravity)
   {
      velocity.y = 0.0f;
      gravityVector = Vector3.zero;
   }

   instantForce = force;

   lastIFTime = Time.time;
   lastIFForce = force;
}

function DoMotion()
{
   if (isArcing)
   {
      if (Time.time >= arcEndTime)
      {
         isArcing = false;
         velocity = controller.velocity;
      }
      else
      {
         // Do jump sin wave
         var cTime : float = Mathf.InverseLerp(arcStartTime, arcEndTime, Time.time);
         var newPos : Vector3  = Vector3.Lerp(arcStartPos, arcEndPos, cTime);
         newPos.y += arcHeight * Mathf.Sin(Mathf.Clamp01(cTime) * Mathf.PI);
         velocity = newPos-transform.position;
         controller.Move(velocity);
      }
   }
   else if (isStickied)
   {
      velocity = Vector3.zero;
   }
   else
   {
      var mask = (1 << 10) | (1 << 4); // terrain & water
      var hit : RaycastHit;

      // Cast downward bbox to hit terrain underneath us
      if (Physics.SphereCast(transform.position+Vector3.up, controller.radius, Vector3.down, hit, 0.7, mask))
      {
         isGrounded = true;

         // On slope
         if (Vector3.Angle(hit.normal, Vector3.up) > slideLimit)
         {
            var hitNormal : Vector3 = hit.normal;
            var moveDirection : Vector3 = Vector3(hitNormal.x, -hitNormal.y, hitNormal.z);
            Vector3.OrthoNormalize (hitNormal, moveDirection);
            moveDirection *= slideSpeed;
            velocity += moveDirection;
         }
         // On flat ground
         else
         {
            // Check to see if we got to the focus target.
            // If so, proceed on pre-focus heading.
            if (focusTarget)
            {
               if (Utility.CheckXZRange(transform.position, focusTarget.position, 0.5))
               {
                  //transform.position = focusTarget.position;
                  // Doing this can trigger another OnTriggerEnter (which is really fucking annoying)
                  focusTarget = null;
                  SetDirection(preFocusDir);
                  model.animation.Play("walk");
                  //Debug.Log("focus capture");
               }
            }

            // Walk normally
            velocity = (walkDir * actualSpeed);
            gravityVector = Vector3.zero;
         }
      }
      // Airborne
      else
      {
         // Keep accelerating downward
         isGrounded = false;
         gravityVector += Physics.gravity * Time.fixedDeltaTime;
      }

      // Apply gravity and time slicing
      velocity += instantForce;
      velocity += gravityVector;

      // Actually move
      controller.Move(velocity*Time.fixedDeltaTime);

      // Store the controller's velocity this frame
      // NOTE: Doing a before and after pos doesn't seem to work. Why not?
      velocity = controller.velocity;

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

   // Reset instant force
   instantForce = Vector3.zero;

}

function CheckStuck()
{
   var blockResolutionSeconds : float = 3.0;
   var blockedTimerExpire : float = Time.time + blockResolutionSeconds;
   var lastPosition : Vector3 = transform.position;
   while (true)
   {
      //Debug.Log("isStickied="+isStickied+" isJumping="+isJumping);
      if (isStickied == false && isArcing == false)
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

function SetFocusTarget(t : Transform)
{
   focusTarget = t;
   if (t)
   {
      preFocusDir = walkDir;
      SetDirection(t.position - transform.position);
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

   if (focusTarget == null)
   {
      transform.rotation.eulerAngles.y = dir;
      walkDir = transform.forward;
   }
}

function ReverseDirection()
{
   if (focusTarget == null)
      walkDir = transform.forward * -1.0;
}


function ArcTo(to : Vector3, height : float, timeToImpact : float)
{
   if (focusTarget == null)
   {
      arcHeight = height;
      arcStartTime = Time.time;
      arcEndTime = arcStartTime + timeToImpact;
      arcStartPos = transform.position;
      arcEndPos = to;
      isArcing = true;
      model.animation.Stop();
   }
}

function SetStickied(stickied : boolean)
{
   isStickied = stickied;
   if (isStickied)
   {
      isGrounded = true;
      velocity = Vector3.zero;
      gravityVector = Vector3.zero;
      model.animation.Stop();
      isArcing = false;
   }
   else
      model.animation.Play("walk");
}

/*
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
*/

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

function Splat(hit : ControllerColliderHit)
{
   var splat : AbilitySplatter = Instantiate(Game.prefab.Ability(0), hit.point, Quaternion.identity).GetComponent(AbilitySplatter);
   splat.Init(hit.collider, hit.point, hit.normal, color);
   splat.WashIn(1.0);
   Destroy(gameObject);
}

function Splat()
{
   Splat(transform.up);
}

function Splat(normal : Vector3)
{
   var hit : RaycastHit;
   var mask = (1 << 10) | (1 << 4); // terrain & water
   var ray : Ray;
   ray.origin = transform.position;
   //ray.direction = (controller.velocity.magnitude == 0) ? Vector3.down : controller.velocity;
   ray.direction = normal * -1.0f;
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      var splat : AbilitySplatter = Instantiate(Game.prefab.Ability(0), hit.point, Quaternion.identity).GetComponent(AbilitySplatter);
      splat.Init(hit, color);
      splat.WashIn(1.0);
   }
   Destroy(gameObject);
}






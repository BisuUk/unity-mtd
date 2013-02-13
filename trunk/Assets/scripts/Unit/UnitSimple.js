#pragma strict
#pragma downcast

var controller : CharacterController;
var color : Color;
var walkSpeedLimits : Vector2;
var gravityMult : float;
var model : GameObject;
var buffs : BuffManager;
var slideSlopeLimit : float; // Angle when downhill force is applied. (Controller.slopeLimit stops unit dead.)
var slideSpeed : float = 1.0;
var slideDamping : float = 1.0;

var isStatic : boolean;
var isArcing : boolean;
@HideInInspector var focusTarget : Transform;
var isGrounded : boolean;
var goalSpeed : float;
var isBoosted : boolean;
var isSliding : boolean;
var pickup : Transform;
var pickupAttach : Transform;


private var externalForce : Vector3;
//private var nextWaypoint : int;
//private var path : List.<Vector3>;
private var walkDir : Vector3;
private var arcHeight : float;
private var arcStartPos : Vector3;
private var arcEndPos : Vector3;
private var arcStartTime : float;
private var arcEndTime : float;
var velocity : Vector3 = Vector3.zero;
private var instantForce : Vector3 = Vector3.zero;

class UnitBuff
{
   var action : ActionType;
   var duration : float;
   var magnitude : float;
   var vector : Vector3;
   var color : Color;
};

static var dnum : int = 0;

//-----------
// UNIT
//-----------
function Awake()
{
   color = Color.white;
   goalSpeed = walkSpeedLimits.x;
   externalForce = Vector3.zero;
   UpdateWalkAnimationSpeed();
   StartCoroutine("CheckStuck");
   isStatic = false;
   isArcing = false;
   //slideSlopeLimit = controller.slopeLimit - .1;
   isGrounded = false;

   gameObject.name = "Unit"+dnum.ToString();
   dnum += 1;
   //Debug.Log("SPAWN:"+gameObject.name+" p="+transform.position);
}

function FixedUpdate()
{
   buffs.Tick();
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
   // Control manipulations
   switch (color)
   {
      case Color.blue:
         if (hit.transform != pickup && hit.collider.tag == "PICKUP")
         {
            pickup = hit.collider.transform;
            if (hit.collider.attachedRigidbody)
               hit.collider.attachedRigidbody.isKinematic = true;
            pickup.parent = pickupAttach;
            pickup.transform.localPosition = Vector3.zero;
            pickup.collider.enabled = false;
         }
         break;

      case Color.red:
         if (hit.collider.attachedRigidbody && hit.collider.tag == "MANIP")
         {
            Destroy(hit.collider.gameObject, 0.01);
            Invoke("Splat", 0.01);
         }
         break;

      case Utility.colorYellow:
         if (hit.collider.attachedRigidbody && hit.collider.tag == "MANIP")
            hit.collider.attachedRigidbody.AddExplosionForce(25.0f*controller.velocity.magnitude, transform.position, 2.0f);
         break;

      default:
      break;
   }


   // Save velocity, since we're going to compare after a fixed update
   var v : Vector3 = controller.velocity;

   // Maximum vertical fall tolerance
   if (v.y < -31.0f)
   {
      // Wait for blue splats to collide, to maybe break the fall.
      // Sometimes it just takes one yield, sometimes more, don't understand
      // that shit. I can't imagine ever needing 3, that'd be sooo stupid.
      yield WaitForFixedUpdate();
      yield WaitForFixedUpdate();

      // Not static? Dead.
      if (isStatic == false && isSliding == false)
         Splat(hit);
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
   if (Time.time < lastIFTime+0.1f && force == lastIFForce)
   {
      //Debug.Log(gameObject.name+" Duplicate force detected, ignoring.");
      return;
   }

   //Debug.Log("InstantForce:"+force);
   if (resetGravity)
      velocity.y = 0.0f;

   instantForce = force;

   lastIFTime = Time.time;
   lastIFForce = force;
}


function DoMotion()
{
   var useGravity : boolean = true;

   // Handle speed boost
   goalSpeed += (isBoosted) ? 0.4 : -0.4;
   goalSpeed = Mathf.Clamp(goalSpeed, walkSpeedLimits.x, walkSpeedLimits.y);

   // Arcing is when the unit is following a precalculated arc trajectory
   if (isArcing)
   {
      if (Time.time >= arcEndTime)
      {
         isArcing = false;
         velocity = controller.velocity;
      }
      else
      {
         // Do arcing motion using sine wave over time
         var cTime : float = Mathf.InverseLerp(arcStartTime, arcEndTime, Time.time);
         var newPos : Vector3  = Vector3.Lerp(arcStartPos, arcEndPos, cTime);
         newPos.y += arcHeight * Mathf.Sin(Mathf.Clamp01(cTime) * Mathf.PI);
         velocity = newPos-transform.position;
         controller.Move(velocity);
      }
   }
   else if (isStatic)
   {
      velocity = Vector3.zero;
      // Hack to make moving triggers work while static
      transform.position.y += Random.Range(-0.000001f, 0.000001f);
   }
   else
   {
      var mask = (1 << 10) | (1 << 4); // terrain & water
      var hit : RaycastHit;
      var hitNormal : Vector3;
      var startCast : Vector3 = transform.position;
      startCast.y += controller.radius + 0.1f;
      // Cast downward bbox to hit terrain that's 0.1 meters underneath us
      // Note: Make sure transform.position is at the very bottom of the capsule collider
      if (Physics.SphereCast(startCast, controller.radius, Vector3.down, hit, controller.radius + 0.15f, mask))
      {
         isGrounded = true;

         // Slope pitch underneath character
         var slopeAngle : float = Vector3.Angle(hit.normal, Vector3.up);

         // If we've begun to slide
         if (isSliding)
         {
            // Get force going down the slope
            hitNormal = hit.normal;
            var slideForce : Vector3 = Vector3(hitNormal.x, -hitNormal.y, hitNormal.z);
            Vector3.OrthoNormalize (hitNormal, slideForce);
            // Scale force linearly depending on difference from vertical
            slideForce *= (slideSpeed*Mathf.InverseLerp(0, 90, slopeAngle));

            // Turn off gravity, it just make it harder to climb, and in this case
            // is just another force to deal with controlling.
            useGravity = false;

            // If standing on speed boost splat...
            if (isBoosted)
            {
               // ...and if sliding downhill, go faster
               if (velocity.y < 0.0f)
                  slideForce *= 5.0f;
               // ...or if sliding, but still going uphill, slow down
               else if (velocity.y > 0.0f)
                  slideForce *= 0.5f;
            }

            // If sliding but we're on non-steep terrain (or flat)
            if (slopeAngle < slideSlopeLimit)
            {
               // If sliding backwards, use damping to gradually go forward again, think traction
               if (Vector3.Angle(walkDir, velocity.normalized) > 90.0f)
                  velocity *= slideDamping;
               else
                  velocity *= 0.99f; // gradually stop sliding regardless

               // If we are going slow enough, stop sliding, and resume walking
               if (velocity.magnitude <= walkSpeedLimits.x)
               {
                  goalSpeed = 0.0f;
                  isSliding = false;
               }
            }

            // Add the total slide for to velocity
            velocity += slideForce;
         }
         // On a steep enough slope, begin sliding down it
         else if (slopeAngle >= slideSlopeLimit)
         {
            // This is a hack, because SphereCast doesn't always return the correct normal.
            // Evidently, if it hits the edge of a poly, it will interpolate the normal, which
            // fucks up my slope detection. So I do a regular raycast to the hit point to confirm.
            var hit2 : RaycastHit;
            if (Physics.Raycast(transform.position+Vector3.up, hit.point-(transform.position+Vector3.up), hit2, Mathf.Infinity, mask))
            {
               slopeAngle = Vector3.Angle(hit2.normal, Vector3.up);
               isSliding = (slopeAngle >= slideSlopeLimit);
            }
         }
         // On flat enough ground (not steep)
         else
         {
            // Check to see if we got to the focus target. If so, proceed on pre-focus heading.
            if (focusTarget)
            {
               if (Utility.CheckXZRange(transform.position, focusTarget.position, 0.5))
               {
                  focusTarget.SendMessage("Captured", this, SendMessageOptions.DontRequireReceiver);
                  focusTarget = null;
                  model.animation.Play("walk");
               }
            }

            var walkForce : Vector3;
            // If we're walking uphill on a non-steep hill...
            if (slopeAngle > 25.0f && velocity.y > 0.0f)
            {
               // Apply the force up the hill, instead of horizontally
               hitNormal = hit.normal;
               walkForce = Vector3(hitNormal.x, -hitNormal.y, hitNormal.z);
               Vector3.OrthoNormalize(hitNormal, walkForce);
               walkForce *= (-goalSpeed);
               // Turn off gravity, it just make it harder to climb
               useGravity = false;
            }
            else // On fairly flat (< 25degrees) surface, apply all force sideways
            {
               walkForce = (walkDir * goalSpeed);

               mask = (mask | (1 << 9)); // tack on obstruct tag
               startCast = transform.position;
               startCast.y += controller.center.y; // half way up the collider
               // Check if we're hitting something in directly in front of us
               // and turn around if there is.
               if (Physics.Raycast(startCast, transform.forward, controller.radius+0.1f, mask))
                  ReverseDirection();
            }

            // Walk if we're not going fast enough
            if (velocity.magnitude < goalSpeed)
            {
               velocity += walkForce;
               velocity = Vector3.ClampMagnitude(velocity, goalSpeed);
            }
            else // slow down if we're going fast
               velocity *= slideDamping;
         }
      }
      // Airborne, (no ground under us), gravity should just manage movement here
      else
      {
         isGrounded = false;
         isSliding = false;
         goalSpeed = 0.0;

         // Give a little nudge forward if we're moving perfectly vertical.
         // This is so we don't get stuck on bouncy splats in front of ledges.
         // NOTE: Don't velocity == Vector3.up is too accurate where if there's
         // 0.0001 movement forward, it won't nudge.
         var horizontalTest : Vector3 = velocity;
         horizontalTest.y = 0.0f;
         if (horizontalTest.magnitude < walkSpeedLimits.x)
            velocity += (walkDir * walkSpeedLimits.x);
      }

      // Update walk speed
      UpdateWalkAnimationSpeed();

      // Apply gravity and any instant applied force, slice by time
      velocity += (instantForce*Time.deltaTime);
      if (useGravity)
         velocity += (Physics.gravity*gravityMult*Time.deltaTime);

      //Debug.Log("v="+velocity);

      // Actually move, apply time slicing
      controller.Move(velocity*Time.deltaTime);

      // Store the controller's velocity this frame, need this
      // in case we hit a wall or other obstacle.
      velocity = controller.velocity;

      // Face direction movement
      transform.rotation = Quaternion.LookRotation(walkDir);
   }

   // Reset per-fixed frame variables
   instantForce = Vector3.zero;
   isBoosted = false;
}


function CheckStuck()
{
   var blockResolutionSeconds : float = 5.0;
   var blockedTimerExpire : float = Time.time + blockResolutionSeconds;
   var lastPosition : Vector3 = transform.position;
   while (true)
   {
      //Debug.Log("isStatic="+isStatic+" isJumping="+isJumping);
      if (isStatic == false && isArcing == false)
      {
         var diffVec : Vector3 = (lastPosition - transform.position);
         diffVec.y = 0.0f;
         var diff : float = diffVec.magnitude;
         //Debug.Log("Diff="+diff);
         if (diff > 0.25)
         {
            lastPosition = transform.position;
            blockedTimerExpire = Time.time + blockResolutionSeconds;
         }
         else if (Time.time > blockedTimerExpire)
         {
            Debug.Log("Unit splatted due to no forward progress.");
            Splat();
            //lastPosition = transform.position;
            //blockedTimerExpire = Time.time + blockResolutionSeconds;
            //ReverseDirection();
         }
      }
      else
      {
         blockedTimerExpire = Time.time + blockResolutionSeconds;
      }
      yield;
   }
}

function SetFocusTarget(t : Transform)
{
   focusTarget = t;
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


function ArcTo(to : Vector3, height : float, timeToImpact : float)
{
   if (isStatic == false)
   {
      velocity = Vector3.zero;
      arcHeight = height;
      arcStartTime = Time.time;
      arcEndTime = arcStartTime + timeToImpact;
      arcStartPos = transform.position;
      arcEndPos = to;
      isArcing = true;
      isSliding = false;
      isGrounded = false;
      goalSpeed = 0;
      model.animation.Stop();
   }
}

function SetStatic(s : boolean)
{
   isStatic = s;
   if (isStatic)
   {
      isGrounded = true;
      isArcing = false;
      velocity = Vector3.zero;
      goalSpeed = 0;
      UpdateWalkAnimationSpeed();
      model.animation.Stop();
   }
   else
   {
      if (focusTarget)
         focusTarget.SendMessage("Unstatic", this, SendMessageOptions.DontRequireReceiver);
      velocity = Vector3.zero;
      model.animation.Play("walk");
   }
}

function ApplyBuff(buff : Buff)
{
   buffs.AddBuff(buff);
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
         UpdateWalkAnimationSpeed();
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
*/

function SetColor(c : Color)
{
   SetColor(c.r, c.g, c.b);
}

@RPC
function SetColor(r : float, g : float, b : float)
{
   color = Color(r,g,b);
   SetChildrenColor(transform, color);

   if (color != Color.blue)
      DropPickup();
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t == pickup)
      return;

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

private var lastGoalSpeed : float;
function UpdateWalkAnimationSpeed()
{
   if (lastGoalSpeed != goalSpeed && model && model.animation)
   {
      lastGoalSpeed = goalSpeed;
      var s : float = goalSpeed*0.5f;
      s = Mathf.Clamp(s, 0, 8);
      // Make all animations in this character play at half speed
      for (var state : AnimationState in model.animation)
         state.speed = s;
   }
}

function Splat(hit : ControllerColliderHit)
{
   var splat : AbilitySplatter = Instantiate(Game.prefab.Ability(0), hit.point, Quaternion.identity).GetComponent(AbilitySplatter);
   splat.Init(hit.collider, hit.point, hit.normal, color);
   splat.WashIn(1.0);
   Die();
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
   Die();
}

function DropPickup()
{
   if (pickup)
   {
      pickup.collider.enabled = true;
      if (pickup.collider.attachedRigidbody)
         pickup.collider.attachedRigidbody.isKinematic = false;
      pickup.parent = null;
   }
}

function Die()
{
   DropPickup();
   Destroy(gameObject);
}





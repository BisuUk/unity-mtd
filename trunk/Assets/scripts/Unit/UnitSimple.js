#pragma strict
#pragma downcast

var controller : CharacterController;
var pickupAttach : Transform;
var buffs : BuffManager;
var model : GameObject;
var explosionParticle : Transform;
var color : Color;
var walkSpeedLimits : Vector2;
var fallImpactLimit : float;
var gravityMult : float;
var slideSlopeLimit : float; // Angle when downhill force is applied. (controller.slopeLimit stops unit dead.)
var slideSpeed : float = 1.0;
var slideDamping : float = 1.0;
@HideInInspector var heading : float;
@HideInInspector var pickup : Transform;
// Hide below when done
var isStatic : boolean;
var isStopped : boolean;
var isArcing : boolean;
var isGrounded : boolean;
var goalSpeed : float;
var isBoosted : boolean;
var isSliding : boolean;

//private var groundNormal : Vector3;
//private var groundContact : Vector3;
var velocity : Vector3 = Vector3.zero;
private var walkDir : Vector3;

private var focusTarget : Transform;
private var arcHeight : float;
private var arcStartPos : Vector3;
private var arcEndPos : Vector3;
private var arcStartTime : float;
private var arcEndTime : float;
private var instantForce : Vector3 = Vector3.zero;

static var dnum : int = 0;

function Awake()
{
   color = Color.white;
   goalSpeed = walkSpeedLimits.x;
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
   var shouldTurnAround : boolean = true;
   var transformedHP : Vector3 = transform.InverseTransformPoint(hit.point);

   if (hit.collider.transform == pickup)
      return;

   // Control manipulations
   switch (color)
   {
      case Color.blue:
         if (pickup == null && hit.transform != pickup
            && hit.transform.parent == null
            && transformedHP.y > controller.stepOffset && transformedHP.z > 0.0
            && (hit.collider.tag == "MANIP" || hit.collider.tag == "PICKUP"))
         {

            var p : Pickup = hit.collider.transform.GetComponent(Pickup);
            if (p)
            {

               p.Pickup(this);
            }
            /*
            pickup = p.transform;
            pickup = hit.collider.transform;
            if (hit.collider.attachedRigidbody)
               hit.collider.attachedRigidbody.isKinematic = true;
            pickup.parent = pickupAttach;
            pickup.transform.localPosition = Vector3.zero;
            //pickup.collider.enabled = false;
            //pickup.collider.isTrigger = true;
            */
            shouldTurnAround = false;
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
         if (isArcing == false && hit.collider.attachedRigidbody && hit.collider.tag == "MANIP")
         {
            var pushForce : Vector3;
            if (controller.velocity.magnitude < 1.0f)
               pushForce = (transform.forward*50.0f);
            else
            {
               pushForce = (transform.forward*controller.velocity.magnitude*50.0f);
               pushForce = Vector3.ClampMagnitude(pushForce, 500.0f);
            }
            hit.collider.attachedRigidbody.AddForce(pushForce);
            shouldTurnAround = false;
            //hit.collider.attachedRigidbody.AddExplosionForce(25.0f*controller.velocity.magnitude, transform.position, 2.0f);
         }
         break;

      default:
      break;
   }

   // If we hit something solid, turn around
   if (shouldTurnAround && isGrounded)
   {
      // If point NOT below unit, and in front of unit
      if (transformedHP.y > controller.stepOffset && transformedHP.z > 0.0)
      {
         // Make sure we're not turning around on a somewhat steep hill
         var slopeAngle : float = Vector3.Angle(hit.normal, Vector3.up);
         if (slopeAngle >= controller.slopeLimit)
            ReverseDirection();
      }
   }

   // Save velocity, since we're going to compare after a fixed update
   var v : Vector3 = controller.velocity;

   if (v.y < -30.0f)
      Debug.Log("impact:"+v.y);

   // Maximum vertical fall tolerance ~13meters
   if (v.y < fallImpactLimit)
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
   else if (isStatic || isStopped)
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
      if (Physics.SphereCast(startCast, controller.radius, Vector3.down, hit, controller.radius + 0.2f, mask))
      {
         isGrounded = true;
         transform.parent = hit.collider.transform;

         // Start walking if we're not
         if (model.animation.IsPlaying("walk") == false)
            model.animation.Play("walk");

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
                  // Needed for determinism
                  transform.position = focusTarget.position;
                  velocity = Vector3.zero;
                  focusTarget = null;
               }
            }

            // Walk if we're not going fast enough
            if (velocity.magnitude < goalSpeed)
               velocity = (walkDir * goalSpeed);
            else // slow down if we're going fast
               velocity *= slideDamping;
         }
      }
      // Airborne, (no ground under us), gravity should just manage movement here
      else
      {
         transform.parent = null;
         isGrounded = false;
         isSliding = false;
         goalSpeed = 0.0;

         // Give a little nudge forward if we're moving perfectly vertical.
         // This is so we don't get stuck on bouncy splats in front of ledges.
         // NOTE: Don't try velocity == Vector3.up is too accurate where if
         // there's 0.0001 movement forward, it won't nudge.
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
   heading = dir;
}

function ReverseDirection()
{
   SetDirection(-walkDir);
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
      t.renderer.material.SetFloat("_Outline", (hovered) ? 0.007 : 0.003);
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

      var p : Pickup = pickup.GetComponent(Pickup);
      if (p)
      {
         pickup = p.transform;
         p.Drop();
      }
/*
      //pickup.collider.enabled = true;
      //pickup.collider.isTrigger = false;

      if (pickup.collider.attachedRigidbody)
      {
         pickup.rotation = Quaternion.identity;
         pickup.position = transform.position;
         pickup.position.y += 5.0f;
         pickup.position += (transform.forward * -2.0f);
         pickup.collider.attachedRigidbody.isKinematic = false;
         //pickup.collider.attachedRigidbody.AddForce(0,200,0);
      }
      pickup.parent = null;
      pickup = null;
*/
   }
}

private function Die()
{
   if (explosionParticle)
   {
      var exp : Transform = Instantiate(explosionParticle, transform.position, Quaternion.identity);
      exp.GetComponentInChildren(ParticleSystem).startColor = color;
   }

   DropPickup();
   Destroy(gameObject);
}


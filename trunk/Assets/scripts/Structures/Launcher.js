#pragma strict
#pragma downcast

class Launcher extends Structure
{
var unitAttachPoint : Transform;
var model : GameObject;
var maxRange : float;
var cooldownTime : float;
var reticleFX : Transform;
var reticleActualFX : Transform;
var selectionFX : Transform;
var fireAnimationSpeed : float;
var reticleScaleRate : float = 4.0;
var reticleMinDiameter : float = 10.0;
var netView : NetworkView;

private var loadedUnit : UnitSimple;
private var numUnitsContained : int;
private var reticleDiameter : float;
private var reticleMaxDiameter: float;

function Awake()
{
   selectionFX.gameObject.SetActive(false);
   reticleFX.gameObject.SetActive(false);
   reticleMaxDiameter = reticleFX.localScale.x;
}

function OnMouseDown()
{
   if (loadedUnit)
      UIControl.CurrentUI().SendMessage("OnPressStructure", this, SendMessageOptions.DontRequireReceiver);
}

function OnPress(isPressed : boolean)
{
   if (loadedUnit)
   {
      if (isPressed)
      {
         isAiming = true;
         StartCoroutine("ReticleOscillate");
      }
      else
      {
         //StopCoroutine("ReticleOscillate");
         if (isAiming)
            Fire();
      }
   }
}

function ReticleOscillate()
{
   reticleDiameter = reticleMaxDiameter;
   var down : boolean = true;
   while (isAiming)
   {
      if (down)
      {
         reticleDiameter -= reticleScaleRate * Game.control.deltaTimeNoScale;
         if (reticleDiameter <= reticleMinDiameter)
         {
            reticleDiameter = reticleMinDiameter;
            down = false;
         }
      }
      else
      {
         reticleDiameter += reticleScaleRate * Game.control.deltaTimeNoScale;
         if (reticleDiameter >= reticleMaxDiameter)
         {
            reticleDiameter = reticleMaxDiameter;
            down = true;
         }
      }
      reticleFX.localScale = Vector3(reticleDiameter, reticleDiameter, reticleDiameter);
      yield;
   }
}

//virtual
function SetSelected(selected : boolean)
{
   //Debug.Log("Launcher SetSelected");
   isSelected = selected;
   reticleFX.gameObject.SetActive(selected);
   reticleFX.localScale = Vector3(reticleMaxDiameter, reticleMaxDiameter, reticleMaxDiameter);
   reticleActualFX.gameObject.SetActive(false);
   isAiming = false;

   selectionFX.gameObject.SetActive(isSelected);
   var tween : TweenScale = selectionFX.GetComponent(TweenScale);
   if (tween && isSelected)
   {
      tween.Reset();
      tween.Play(true);
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      if (numUnitsContained==1)
      {
         //unit.ReversePath();
         unit.ReverseDirection();
      }
      else
      {
         loadedUnit = unit;
         loadedUnit.SetStickied(true); // just use stickied() to hold unit still on launcher
         loadedUnit.transform.position = unitAttachPoint.position;
         loadedUnit.transform.parent = unitAttachPoint;
         numUnitsContained += 1;
         reticleFX.gameObject.SetActive(isSelected);
      }
   }
}

function Update()
{
   if (isSelected)
   {
      var mouseHit : RaycastHit = Game.control.GetMouseWorldPosition();

      // Look towards mouse cursor, with no pitch
      var lookat : Vector3 = mouseHit.point;
      lookat.y = transform.position.y;
      transform.LookAt(lookat);

      var vectToAim : Vector3 = (mouseHit.point - transform.position);
      //vectToAim.y = transform.position.y;

      // Put reticle at mouse pos, within range
      var reticlePos : Vector3 = mouseHit.point;
      if (vectToAim.magnitude > maxRange)
         reticlePos = transform.position + (vectToAim.normalized * maxRange);
      //reticleFX.position = Utility.GetGroundAtPosition(reticlePos, 0.2); // Bump up
      reticleFX.position = reticlePos;
      //reticleFX.rotation.eulerAngles = mouseHit.normal;
   }
}

//virtual
function CancelAim()
{
   isAiming = false;
   reticleFX.localScale = Vector3(reticleMaxDiameter, reticleMaxDiameter, reticleMaxDiameter);
   //Debug.Log("CancelAim");
}

//virtual
function Fire()
{
   Game.player.ClearSelectedStructure();
   isAiming = false;

   //Debug.Log("Launcher Fire: " +reticleFX.position);
   model.animation["fire"].speed = fireAnimationSpeed;
   model.animation.Play("fire");

   loadedUnit.transform.parent = null;
   loadedUnit.SetStickied(false);

   var reticleGroundPos : Vector3;
   reticleGroundPos.x = reticleFX.position.x + (-reticleDiameter/2.0 + Random.value*reticleDiameter) * transform.localScale.x;
   reticleGroundPos.z = reticleFX.position.z + (-reticleDiameter/2.0 + Random.value*reticleDiameter) * transform.localScale.z;
   reticleGroundPos.y = reticleFX.position.y + (-reticleDiameter/2.0 + Random.value*reticleDiameter) * transform.localScale.y;
   //reticleGroundPos.y = reticleFX.position.y - 0.2;    // Bump down, see bump up, above.
   //reticleFX.gameObject.SetActive(true);


   // Draw ray from camera mousepoint to ground plane.
   var hit : RaycastHit;
   var mask = (1 << 10) | (1 << 4); // terrain & water
   if (Physics.Raycast(Camera.main.transform.position, (reticleGroundPos - Camera.main.transform.position), hit, Mathf.Infinity, mask))
   {
      reticleGroundPos = hit.point;
   }

   reticleActualFX.gameObject.SetActive(true);
   reticleActualFX.position = reticleGroundPos;
   reticleActualFX.LookAt(reticleGroundPos+hit.normal);
   reticleActualFX.Rotate(90.0f, 0.0f, 0.0f);

   StartCoroutine(FadeOut(reticleActualFX)); // fade out actual reticle

   loadedUnit.SetDirection((reticleGroundPos - transform.position));

   loadedUnit.ArcTo(reticleGroundPos, 15, 1.0);
   loadedUnit = null;

   Invoke("Cooldown", cooldownTime);
}

private function Cooldown()
{
   numUnitsContained = 0;
}

private function FadeOut(t : Transform)
{
   var fadeStart : float = Time.time;
   var fadeEnd : float = Time.time+0.75; // fade time
   while (Time.time <= fadeEnd)
   {
      Utility.SetChildrenAlpha(t, 1-Mathf.InverseLerp(fadeStart, fadeEnd, Time.time));
      yield;
   }
   t.gameObject.SetActive(false);
}

} // class



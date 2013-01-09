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
private var windup : boolean;
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
         windup = true;
         StartCoroutine("ReticleOscillate");
      }
      else
      {
         //StopCoroutine("ReticleOscillate");
         windup = false;
         Fire();
      }
   }
}

function ReticleOscillate()
{
   reticleDiameter = reticleMaxDiameter;
   var down : boolean = true;
   while (windup)
   {
      if (down)
      {
         reticleDiameter -= reticleScaleRate;
         if (reticleDiameter <= reticleMinDiameter)
         {
            reticleDiameter = reticleMinDiameter;
            down = false;
         }
      }
      else
      {
         reticleDiameter += reticleScaleRate;
         if (reticleDiameter >= reticleMaxDiameter)
         {
            reticleDiameter = reticleMaxDiameter;
            down = true;
         }
      }
      reticleFX.localScale = Vector3(reticleDiameter, 1, reticleDiameter);
      yield;
   }
}

//virtual
function SetSelected(selected : boolean)
{
   //Debug.Log("Launcher SetSelected");
   isSelected = selected;

   reticleFX.gameObject.SetActive(selected);
   reticleFX.localScale = Vector3(reticleMaxDiameter, 1, reticleMaxDiameter);

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
         unit.ReversePath();
      }
      else
      {
         loadedUnit = unit;
         loadedUnit.SetStickied(true);
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
      var mousePos : Vector3 = Game.control.GetMouseWorldPosition();

      // Look towards mouse cursor, with no pitch
      var lookat : Vector3 = mousePos;
      lookat.y = transform.position.y;
      transform.LookAt(lookat);

      var vectToAim : Vector3 = (mousePos - transform.position);
      //vectToAim.y = transform.position.y;

      // Put reticle at mouse pos, within range
      var reticlePos : Vector3 = mousePos;
      if (vectToAim.magnitude > maxRange)
         reticlePos = transform.position + (vectToAim.normalized * maxRange);
      reticleFX.position = Utility.GetGroundAtPosition(reticlePos, 0.2); // Bump up
   }
}

//virtual
function CancelAim()
{
   StopCoroutine("ReticleOscillate");
   windup = false;
}

//virtual
function Fire()
{
   //Debug.Log("Launcher Fire: " +reticleFX.position);
   model.animation["fire"].speed = fireAnimationSpeed;
   model.animation.Play("fire");

   loadedUnit.transform.parent = null;
   loadedUnit.SetStickied(false);

   var reticleGroundPos : Vector3;
   reticleGroundPos.x = reticleFX.position.x + (-reticleDiameter/2.0 + Random.value*reticleDiameter) * transform.localScale.x;
   reticleGroundPos.z = reticleFX.position.z + (-reticleDiameter/2.0 + Random.value*reticleDiameter) * transform.localScale.z;

   // Bump down, see bump up, above.
   reticleGroundPos.y = reticleFX.position.y - 0.2;

   reticleActualFX.gameObject.SetActive(true);
   reticleActualFX.position = reticleGroundPos;
   Invoke("RemoveActualReticle", 1.0);

   loadedUnit.jumpDieOnImpact = true;
   loadedUnit.Jump(reticleGroundPos, 15, 1.0);
   loadedUnit = null;
   Game.player.ClearSelectedStructure();

   Invoke("Cooldown", cooldownTime);
}

private function RemoveActualReticle()
{
   reticleActualFX.gameObject.SetActive(false);
}

private function Cooldown()
{
   numUnitsContained = 0;
}

} // class



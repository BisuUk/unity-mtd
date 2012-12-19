#pragma strict
#pragma downcast

var fireRate : float;
var windUpTime : float;
var muzzlePosition : Transform;


var shotFXPrefab : Transform;

private var readyToFire : boolean;

class MonsterLightning extends Monster
{

function Start()
{
   super.Start();
   readyToFire = true;
}

function Update()
{
   super.Update();

   if (readyToFire && targets.Count > 0)
   {
      var target : Unit = FindSingleTarget(false);
      if (target)
      {
         readyToFire = false;
         FireAt(target);
      }
   }
}

function Cooldown()
{
   readyToFire = true;
}

function FireAt(unit : Unit)
{

   // Blend in fire animation
   if (model)
      model.animation.CrossFade("fireRW", 0.1);

   // Pause for windup animation
   yield WaitForSeconds(windUpTime);

   // Spawn visual fx
   SpawnShotFX(unit.transform.position);

   // Check it target is still alive, and apply effect
   if (!Network.isClient && unit)
      unit.ApplyDamage(99, unit.health, unit.actualColor);

   // Set next time to fire
   Invoke("Cooldown", fireRate);
}

function SpawnShotFX(targetLocation : Vector3)
{
   // Note this shoots from target TO the source
   var shotFX : Transform = Instantiate(shotFXPrefab, targetLocation, Quaternion.identity);
   var lightningFX : LightningBoltFX = shotFX.GetComponent(LightningBoltFX);
   lightningFX.endPosition = muzzlePosition;
   lightningFX.startPosition.position = targetLocation;
}

}
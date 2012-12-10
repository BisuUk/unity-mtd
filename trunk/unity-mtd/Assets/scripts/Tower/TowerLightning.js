#pragma strict
#pragma downcast

var tower : Tower;
var turnSpeed : float;
var muzzlePosition : Transform;
var shotFXPrefab : Transform;
var fireAnimSpeedLimits : Vector2;
var timeUntilEffectLimits : Vector2;

private var target : GameObject;
private var nextFireTime : float;
private var lastConstructing : boolean;


function Update()
{
   if (tower.isConstructing)
   {
      // Stop animations
      if (lastConstructing == false)
      {
         if (tower.character)
         {
            tower.character.animation.Stop("fireRW");
            tower.character.animation.Stop("idleRW");
         }
      }
   }
   else
   {
      // Start idle animation
      if (lastConstructing == true)
      {
         if (tower.character)
            tower.character.animation.CrossFade("idleRW");
      }

      // Server manages targeting behavior
      if (!Network.isClient)
      {
         var targ : GameObject = tower.FindSingleTarget(false);
         if (targ)
         {
            // Turn to face target
            transform.rotation = Quaternion.Slerp(
               transform.rotation,
               Quaternion.LookRotation(targ.transform.position-transform.position),
               Time.deltaTime * turnSpeed);

            // Instantaneous turn to face target
            //transform.LookAt(targ.transform);

            target = targ;
   
            //  Fire if it's time
            if(Time.time >= nextFireTime)
            {
               Fire(target.transform.position);
               if (Game.hostType>0)
                  tower.netView.RPC("Fire", RPCMode.Others, target.transform.position);
            }
         }
      }
   }
   lastConstructing = tower.isConstructing;
}

// Used when the tower game object is behaving like a placement cursor
function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

function AttributesSet()
{
   // New attributes typically after Initialize() or Modify()
   if (tower.character)
   {
      // Set animation speed based on new fire rate setting
      tower.character.animation["fireRW"].speed = Mathf.Lerp(fireAnimSpeedLimits.x, fireAnimSpeedLimits.y, tower.AdjustFireRate(tower.fireRate, true));
      //for (var state : AnimationState in tower.character.animation)
      //   state.speed = Mathf.Lerp(fireAnimSpeedLimits.x, fireAnimSpeedLimits.y, tower.AdjustFireRate(tower.fireRate, true));
   }
}

@RPC
function Fire(targetLocation : Vector3)
{
   // Blend in fire animation
   if (tower.character)
      tower.character.animation.CrossFade("fireRW", 0.1);

   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   // Pause for windup animation
   yield WaitForSeconds(Mathf.Lerp(timeUntilEffectLimits.x, timeUntilEffectLimits.y, tower.AdjustFireRate(tower.fireRate, true)));

   // Don't fire if we're constructing
   if (tower.isConstructing)
      return;

   // Spawn visual fx
   SpawnShotFX(targetLocation);

   // Check it target is still alive, and apply effect
   if (!Network.isClient && target)
   {
      var targUnitScr : Unit = target.GetComponent(Unit);
      targUnitScr.ApplyDamage(tower.ID, tower.strength, tower.color);
   }
}

function SpawnShotFX(targetLocation : Vector3)
{
   // Note this shoots from target TO the source
   var shotFX : Transform = Instantiate(shotFXPrefab, targetLocation, Quaternion.identity);
   var lightningFX : LightningBoltFX = shotFX.GetComponent(LightningBoltFX);
   lightningFX.endPosition = muzzlePosition;
   lightningFX.startPosition.position = targetLocation;
}

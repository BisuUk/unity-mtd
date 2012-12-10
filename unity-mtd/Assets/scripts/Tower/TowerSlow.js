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


function Update()
{
   if (!tower.isConstructing)
   {
      // Server manages targeting behavior
      if (Network.isServer || Game.hostType==0)
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

   // Spawn visual fx
   SpawnShotFX(targetLocation);
}

function SpawnShotFX(targetLocation : Vector3)
{
   var shotObject : Transform = Instantiate(shotFXPrefab, muzzlePosition.position, Quaternion.identity);
   var projectile : DirectProjectile = shotObject.GetComponent(DirectProjectile);
   projectile.targetLocation = targetLocation;
   projectile.Fire();
   // Apply slow effect when it hits target
   if (!Network.isClient)
   {
      projectile.reachTargetReceiver = transform;
      projectile.reachTargetFunction = "ApplySlowEffect";
   }
}

function ApplySlowEffect()
{
   // Check it target is still alive
   if (!Network.isClient && target)
   {
      // Apply slowdown effect
      var targUnitScr : Unit = target.GetComponent(Unit);
      var e : Effect = new Effect();
      e.type = tower.effect;
      e.val = Mathf.Lerp(0.2, 0.8, tower.AdjustStrength(tower.strength, true));
      e.color = tower.color;
      e.interval = 0.0;    // applied every frame
      e.expireTime = Time.time + 1.0; // FIXME: Calc duration
      targUnitScr.ApplyDebuff(tower.ID, e, true);
   }
}
#pragma strict
#pragma downcast

var barrelLeft : Transform;
var barrelRight : Transform;
var recoilDistance : float = 0.3;
var recoilRecoverSpeed : float = 0.03;
var laserPulsePrefab : Transform;
var towerBase : Tower;
var netView : NetworkView;
private var target : GameObject;
private var laserPulse : Transform;
private var nextFireTime : float;
private var lastBarrelFired : Transform;
private var origBarrelOffset : float;
static private var playerData : PlayerData;


function Awake()
{
   lastBarrelFired = barrelRight;
   origBarrelOffset = lastBarrelFired.localPosition.z;
}


function Update()
{
   if (towerBase.isConstructing==false)
   {
      // Server manages targeting behavior
      if (Network.isServer)
      {
         var targ : GameObject = towerBase.FindTarget(false);
         if (targ)
         {
            transform.LookAt(targ.transform);
            target = targ;
   
            //  Fire if it's time
            if(Time.time >= nextFireTime)
            {
               Fire(target.transform.position);
               netView.RPC("Fire", RPCMode.Others, target.transform.position);
            }
         }
      }

      // Move gun barrels back into place from recoil
      if (lastBarrelFired.localPosition.z < origBarrelOffset)
         lastBarrelFired.localPosition.z += recoilRecoverSpeed;
      else if (lastBarrelFired.localPosition.z > origBarrelOffset)
         lastBarrelFired.localPosition.z = origBarrelOffset;
   }
}


@RPC
function Fire(targetLocation : Vector3)
{
   lastBarrelFired = (lastBarrelFired==barrelLeft) ? barrelRight : barrelLeft;
   
   var pulse : Transform = Instantiate(laserPulsePrefab, transform.position, Quaternion.identity);
   var tpl : TowerPulseLaser = pulse.gameObject.GetComponent(TowerPulseLaser);
   tpl.muzzlePosition = lastBarrelFired.transform.position;
   tpl.targetPosition = targetLocation;
   tpl.laserColor = towerBase.color;

   // Recoil barrel
   lastBarrelFired.localPosition.z -= recoilDistance;

   // Set next time to fire
   nextFireTime  = Time.time + towerBase.fireRate;

   // Owner will apply damage to unit
   if (Network.isServer)
   {
      var tUnit : Unit = target.GetComponent(Unit);
      var rDmg : float = (0.3333 * (1.0 - Mathf.Abs(towerBase.color.r-tUnit.color.r)));
      var gDmg : float = (0.3333 * (1.0 - Mathf.Abs(towerBase.color.g-tUnit.color.g)));
      var bDmg : float = (0.3333 * (1.0 - Mathf.Abs(towerBase.color.b-tUnit.color.b)));
      //Debug.Log("TowerPulse:Fire: rDmg="+rDmg+" gDmg="+gDmg+" bDmg="+bDmg);
      var dmg : int = towerBase.damage * (rDmg + gDmg + bDmg);
   
      //if (tUnit.DoDamage(dmg, color) == false)
      tUnit.DoDamage(dmg, towerBase.color.r, towerBase.color.g, towerBase.color.b);
      //kills += 1;
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


/*
// LIGHTNING BOLT EFFECT
var target : GameObject;
var LR : LineRenderer;
var arcLength = 2.0;
var arcVariation = 2.0;
var inaccuracy = 1.0;

function Update()
{

   var lastPoint = transform.position;
   var i = 1;
   LR.SetPosition(0, transform.position);//make the origin of the LR the same as the transform
   while (Vector3.Distance(target.transform.position, lastPoint) >.5)
   {
      //was the last arc not touching the target?
      LR.SetVertexCount(i + 1);//then we need a new vertex in our line renderer
      var fwd = target.transform.position - lastPoint;//gives the direction to our target from the end of the last arc
      fwd.Normalize();//makes the direction to scale
      fwd = Randomize(fwd, inaccuracy);//we don't want a straight line to the target though
      fwd *= Random.Range(arcLength * arcVariation, arcLength);//nature is never too uniform
      fwd += lastPoint;//point + distance * direction = new point. this is where our new arc ends
      LR.SetPosition(i, fwd);//this tells the line renderer where to draw to
      i++;
      lastPoint = fwd;//so we know where we are starting from for the next arc
   }

}

function Randomize (v3 : Vector3, inaccuracy2 : float)
{
   v3 += Vector3(Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0)) * inaccuracy2;
   v3.Normalize();
   return v3;
}
*/
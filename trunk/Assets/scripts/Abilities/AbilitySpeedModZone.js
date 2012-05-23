#pragma strict
#pragma downcast

var color : Color;
var zone : Rect;
var speedMod : float;
var isBuff : boolean;
var duration : float;
var netView : NetworkView;

private var ID : int;
private var effect : Effect;
private var startTime : float;

private static var alpha : float = 0.33;

function Start()
{
   if (Network.isServer || Game.hostType == 0)
   {
      ID = Utility.GetUniqueID();

      effect = new Effect();
      effect.type = Effect.Types.EFFECT_SPEED;
      effect.val = speedMod;
      effect.color = color;
      effect.interval = 0.0;
      effect.expireTime = 0.0;
   
      color.a = alpha;
      SetChildrenColor(transform, color);
   
      startTime = Time.time;
   }
}

function Update()
{
   if (Network.isServer || Game.hostType == 0)
   {
      // Find all game objects with tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
      var goingToDestroy : boolean = false;

      if (Time.time >= startTime+duration)
         goingToDestroy = true;

      // Iterate through them and find the closest one
      for (var obj : GameObject in objs)
      {
         var unitScr : Unit = obj.GetComponent(Unit);

         if (goingToDestroy)
         {
            // Remove effect if this area is about to be destroyed
            if (isBuff)
               unitScr.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
            else
               unitScr.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
         }
         else if (unitScr.isAttackable && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
         {
            if (renderer.bounds.Contains(obj.transform.position))
            {
               if (isBuff)
                  unitScr.ApplyBuff(ID, effect, false);
               else
                  unitScr.ApplyDebuff(ID, effect, false);
            }
            else
            {
               if (isBuff)
                  unitScr.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
               else
                  unitScr.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
            }
         }
      }

      if (goingToDestroy)
      {
         if (Game.hostType>0)
            Network.Destroy(gameObject);
         else
            Destroy(gameObject);
      }
   }

   // Animate texture for that weird fx...
   var texOffset : Vector2 = Vector2(0, Time.time * 5.0);
   renderer.material.SetTextureOffset("_MainTex", texOffset);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

@RPC
function ToClientSetColor(r : float, g : float, b : float)
{
   var c : Color = Color(r,g,b);
   c.a = alpha;
   SetChildrenColor(transform, c);
}

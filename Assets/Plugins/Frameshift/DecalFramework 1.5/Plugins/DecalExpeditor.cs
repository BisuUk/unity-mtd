using System.Collections.Generic;
using UnityEngine;

public abstract class DecalExpeditor : MonoBehaviour
{
    protected DecalType _decalType;
    public DecalType DecalType
    {
        get { return _decalType; }
        set { _decalType = value; }
    }
    protected List<Mesh> _allDecalMeshes = new List<Mesh>();// All current live decals
    protected List<GameObject> _freeDecals = new List<GameObject>();// Free decals
    protected int _N = 0;
    protected float _timeSinceLastAdd;
    private DecalHolder _decalHolder;
    public DecalHolder Holder
    {
        get { return _decalHolder; }
        set { _decalHolder = value; }
    }


    public abstract void PushNewDecalMesh(Mesh newDecalMesh);
    public abstract void DeleteCombinnedMesh();

    [System.Reflection.ObfuscationAttribute]
    private void Update()
    {          
        if (Time.time - _timeSinceLastAdd > _decalType.i_expeditorLifeTime)
        {

            foreach (Mesh mesh in _allDecalMeshes)
            {
                Destroy(mesh);
            }


            DeleteCombinnedMesh();

            _decalHolder.DecalType2DecalObject.Remove(_decalType);

            Destroy(this.gameObject);
        }
    }
}
